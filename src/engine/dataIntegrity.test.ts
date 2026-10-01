import { describe, expect, it } from "vitest";
import { generateIndustryWorkspace } from "../generator/datasetGenerator";
import { createCubeView, canDrillDown } from "./cubeEngine";
import { buildPresentationSlides } from "../export/pptxExport";
import { availableRollupTransition } from "../components/operations/RollupPanel";

const workspace = () => generateIndustryWorkspace({ title: "Integrity", industryId: "furniture-home", random: () => 0.3 });

describe("fact integrity across views and exports", () => {
  it("does not claim leaf-to-parent roll-up when only parent facts exist", () => {
    const w = workspace();
    const product = w.dataset.dimensions[1];
    w.activeLevels.product = "product-item";
    w.dataset.facts.forEach((fact) => {
      fact.coordinates.product = product.levels[1].members.find((member) => member.id === fact.coordinates.product)!.parentMemberId!;
    });
    const result = createCubeView(w.dataset, { ...w, operation: { type: "rollup", dimensionId: "product", targetLevelId: "product-category" } });
    expect(result.view).toBeNull();
    expect(result.errors.join(" ")).toContain("source-level data");
  });

  it("does not expose Roll-up from a top-level default", () => {
    const w = workspace();

    expect(availableRollupTransition(
      w.dataset,
      w.dataset.dimensions.find((dimension) => dimension.id === "product")!,
      w.activeLevels,
    )).toBeUndefined();
    expect(availableRollupTransition(
      w.dataset,
      w.dataset.dimensions.find((dimension) => dimension.id === "location")!,
      w.activeLevels,
    )).toBeUndefined();
  });
  it("rejects mixed-grain drill-down rather than silently losing coarse facts", () => {
    const w = workspace();
    w.dataset.facts[0].coordinates.time = "q1";
    expect(canDrillDown(w.dataset, w.activeLevels, "time", "time-month")).toBe(false);
    const result = createCubeView(w.dataset, { ...w, operation: { type: "drilldown", dimensionId: "time", targetLevelId: "time-month" } });
    expect(result.view).toBeNull();
    expect(result.errors).toContain("No lower-level data is available for this Drill-down operation.");
  });

  it("rejects parent chains that skip the requested level", () => {
    const w = workspace();
    const time = w.dataset.dimensions[0];
    time.levels[2].members[0].parentMemberId = time.levels[0].members[0].id;
    const result = createCubeView(w.dataset, { ...w, operation: { type: "original" } });
    expect(result.view).toBeNull();
    expect(result.errors.join(" ")).toContain("Not all Time facts");
  });

  it("does not offer a roll-up target whose parent chain skips a level", () => {
    const w = workspace();
    const time = w.dataset.dimensions[0];
    w.activeLevels.time = "time-month";
    time.levels[2].members[0].parentMemberId = time.levels[0].members[0].id;

    const transition = availableRollupTransition(w.dataset, time, w.activeLevels);
    expect(transition?.targets.map((level) => level.id)).toEqual(["time-year"]);
  });

  it("prevents invalid measures being exported as partial totals", () => {
    const w = workspace();
    w.dataset.facts[0].measures.sales = NaN;
    const slides = buildPresentationSlides(w).slice(1);
    expect(slides.every((slide) => slide.view === null && slide.errors.length > 0)).toBe(true);
  });

  it("keeps saved source changes consistent with presentation details", () => {
    const w = workspace();
    w.activeLevels.time = "time-month";
    w.operations.rollup.targetLevelId = "time-quarter";
    const slide = buildPresentationSlides(w).find((entry) => entry.kind === "rollup")!;
    expect(slide.errors).toEqual([]);
    expect(slide.details).toContain("Time: Month → Quarter");
    expect(slide.description).toContain("from Month level to Quarter level");
  });
});
