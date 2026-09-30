import { describe, expect, it } from "vitest";
import type { CubeDataset } from "../models/cube";
import type { AxisMapping, OperationConfig } from "../models/operation";
import { sumValues } from "./aggregation";
import { canDrillDown, createCubeView, type CubeBuildResult } from "./cubeEngine";

const axisMapping: AxisMapping = { x: "time", y: "product", z: "location" };

const activeLevels = {
  time: "time-quarter",
  product: "product-item",
  location: "location-city",
};

const createTestDataset = (): CubeDataset => ({
  title: "Test sales cube",
  dimensions: [
    {
      id: "time",
      name: "Time",
      levels: [
        {
          id: "time-year",
          name: "Year",
          order: 1,
          members: [{ id: "year-2026", label: "2026", levelId: "time-year" }],
        },
        {
          id: "time-quarter",
          name: "Quarter",
          order: 2,
          members: [
            { id: "q1", label: "Q1", levelId: "time-quarter", parentMemberId: "year-2026" },
            { id: "q2", label: "Q2", levelId: "time-quarter", parentMemberId: "year-2026" },
          ],
        },
        {
          id: "time-month",
          name: "Month",
          order: 3,
          members: [
            { id: "jan", label: "Jan", levelId: "time-month", parentMemberId: "q1" },
            { id: "apr", label: "Apr", levelId: "time-month", parentMemberId: "q2" },
          ],
        },
      ],
    },
    {
      id: "product",
      name: "Product",
      levels: [
        {
          id: "product-category",
          name: "Category",
          order: 1,
          members: [
            { id: "seating", label: "Seating", levelId: "product-category" },
            { id: "storage", label: "Storage", levelId: "product-category" },
          ],
        },
        {
          id: "product-item",
          name: "Item",
          order: 2,
          members: [
            { id: "sofa", label: "Sofa", levelId: "product-item", parentMemberId: "seating" },
            { id: "bookcase", label: "Bookcase", levelId: "product-item", parentMemberId: "storage" },
          ],
        },
      ],
    },
    {
      id: "location",
      name: "Location",
      levels: [
        {
          id: "location-country",
          name: "Country",
          order: 1,
          members: [
            { id: "australia", label: "Australia", levelId: "location-country" },
            { id: "usa", label: "USA", levelId: "location-country" },
          ],
        },
        {
          id: "location-city",
          name: "City",
          order: 2,
          members: [
            { id: "perth", label: "Perth", levelId: "location-city", parentMemberId: "australia" },
            { id: "sydney", label: "Sydney", levelId: "location-city", parentMemberId: "australia" },
            { id: "los-angeles", label: "Los Angeles", levelId: "location-city", parentMemberId: "usa" },
          ],
        },
      ],
    },
  ],
  measures: [{ id: "sales", name: "Sales", aggregation: "sum" }],
  facts: [
    { coordinates: { time: "jan", product: "sofa", location: "perth" }, measures: { sales: 100 } },
    { coordinates: { time: "jan", product: "sofa", location: "sydney" }, measures: { sales: 200 } },
    { coordinates: { time: "apr", product: "bookcase", location: "perth" }, measures: { sales: 50 } },
    { coordinates: { time: "apr", product: "bookcase", location: "los-angeles" }, measures: { sales: 75 } },
  ],
});

const build = (operation: OperationConfig): CubeBuildResult =>
  createCubeView(createTestDataset(), { axisMapping, activeLevels, operation });

const expectView = (result: CubeBuildResult) => {
  expect(result.errors).toEqual([]);
  expect(result.view).not.toBeNull();
  return result.view!;
};

const cellValue = (
  result: CubeBuildResult,
  xMemberId: string,
  yMemberId: string,
  zMemberId: string,
): number | undefined =>
  result.view?.cells.find(
    (cell) =>
      cell.xMemberId === xMemberId
      && cell.yMemberId === yMemberId
      && cell.zMemberId === zMemberId,
  )?.value;

describe("cube engine", () => {
  it("does not repeat dataset validation errors", () => {
    const result = createCubeView(
      { ...createTestDataset(), measures: [] },
      { axisMapping, activeLevels, operation: { type: "original" } },
    );

    expect(result.errors.filter((error) => error === "Add a SUM measure before rendering a cube.")).toHaveLength(1);
    expect(result.view).toBeNull();
  });

  it("does not repeat empty-hierarchy validation errors", () => {
    const dataset = createTestDataset();
    dataset.dimensions[0] = { ...dataset.dimensions[0], levels: [] };
    const result = createCubeView(dataset, { axisMapping, activeLevels, operation: { type: "original" } });

    expect(result.errors.filter((error) => error === "Time needs at least one hierarchy level.")).toHaveLength(1);
    expect(result.view).toBeNull();
  });

  it("aggregates leaf facts at the selected hierarchy levels", () => {
    expect(sumValues([100, 200])).toBe(300);

    const result = build({ type: "original" });
    expectView(result);
    expect(cellValue(result, "q1", "sofa", "perth")).toBe(100);
    expect(cellValue(result, "q1", "sofa", "sydney")).toBe(200);
  });

  it("slices one dimension to the selected member", () => {
    const result = build({ type: "slice", dimensionId: "location", memberId: "perth" });
    const view = expectView(result);

    expect(view.z.members.map((member) => member.id)).toEqual(["perth"]);
    expect(view.cells).toHaveLength(2 * 2 * 1);
    expect(cellValue(result, "q1", "sofa", "perth")).toBe(100);
    expect(view.cells.some((cell) => cell.zMemberId === "sydney")).toBe(false);
  });

  it("dices the cube to only the selected combinations", () => {
    const result = build({
      type: "dice",
      selections: {
        time: ["q1"],
        product: ["sofa"],
        location: ["perth", "sydney"],
      },
    });
    const view = expectView(result);

    expect(view.x.members.map((member) => member.id)).toEqual(["q1"]);
    expect(view.y.members.map((member) => member.id)).toEqual(["sofa"]);
    expect(view.z.members.map((member) => member.id)).toEqual(["perth", "sydney"]);
    expect(view.cells).toHaveLength(2);
    expect(view.cells.every((cell) => cell.xMemberId === "q1" && cell.yMemberId === "sofa")).toBe(true);
  });

  it("rolls City up to Country and sums Perth and Sydney into Australia", () => {
    const result = build({
      type: "rollup",
      dimensionId: "location",
      targetLevelId: "location-country",
    });
    const view = expectView(result);

    expect(view.z.levelId).toBe("location-country");
    expect(view.z.members.map((member) => member.id)).toEqual(["australia", "usa"]);
    expect(cellValue(result, "q1", "sofa", "australia")).toBe(300);
  });

  it("uses the configured source level when the visible default is already at the top", () => {
    const result = createCubeView(createTestDataset(), {
      axisMapping,
      activeLevels: {
        time: "time-quarter",
        product: "product-category",
        location: "location-country",
      },
      operation: {
        type: "rollup",
        dimensionId: "product",
        sourceLevelId: "product-item",
        targetLevelId: "product-category",
      },
    });
    const view = expectView(result);

    expect(view.y.levelId).toBe("product-category");
    expect(cellValue(result, "q1", "seating", "australia")).toBe(300);
  });

  it("refreshes a stale configured source after the active level changes", () => {
    const result = createCubeView(createTestDataset(), {
      axisMapping,
      activeLevels: {
        time: "time-month",
        product: "product-item",
        location: "location-city",
      },
      operation: {
        type: "rollup",
        dimensionId: "time",
        sourceLevelId: "time-quarter",
        targetLevelId: "time-quarter",
      },
    });
    const view = expectView(result);

    expect(view.x.levelId).toBe("time-quarter");
    expect(view.description).toContain("from Month level to Quarter level");
  });

  it("drills Quarter down to leaf Month data", () => {
    const result = build({
      type: "drilldown",
      dimensionId: "time",
      targetLevelId: "time-month",
    });
    const view = expectView(result);

    expect(view.x.levelId).toBe("time-month");
    expect(view.x.members.map((member) => member.id)).toEqual(["jan", "apr"]);
    expect(cellValue(result, "jan", "sofa", "perth")).toBe(100);
    expect(cellValue(result, "q1", "sofa", "perth")).toBeUndefined();
    expect(canDrillDown(createTestDataset(), activeLevels, "time", "time-month")).toBe(true);
  });

  it("rejects drill-down when no lower-level fact records exist", () => {
    const dataset = createTestDataset();
    dataset.facts = [
      { coordinates: { time: "q1", product: "sofa", location: "perth" }, measures: { sales: 300 } },
    ];

    const result = createCubeView(dataset, {
      axisMapping,
      activeLevels,
      operation: { type: "drilldown", dimensionId: "time", targetLevelId: "time-month" },
    });

    expect(result.view).toBeNull();
    expect(result.errors).toContain("No lower-level data is available for this Drill-down operation.");
    expect(canDrillDown(dataset, activeLevels, "time", "time-month")).toBe(false);
  });
});
