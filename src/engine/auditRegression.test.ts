import { describe, expect, it } from "vitest";
import { generateIndustryWorkspace, refreshSalesFacts } from "../generator/datasetGenerator";
import { getIndustryTemplate } from "../generator/industryTemplates";
import { buildPresentationSlides, validatePresentation } from "../export/presentationModel";
import { setFactMeasureInput } from "../utils/factInput";
import { safeFilename } from "../utils/filename";
import { validateDataset } from "./validation";
import { canDrillDown, createCubeView, validateCubeRequest } from "./cubeEngine";
import { rollupSourceLevel } from "./hierarchy";

const workspace = () => generateIndustryWorkspace({
  title: "Audit",
  industryId: "furniture-home",
  random: () => 0.3,
});

describe("audit regressions", () => {
  it("rejects Drill-down when the source Original level is not representable", () => {
    const w = workspace();
    const time = w.dataset.dimensions[0];
    // Skip Quarter: Month parents point at Year.
    time.levels[2].members.forEach((member) => {
      member.parentMemberId = time.levels[0].members[0].id;
    });
    w.activeLevels.time = "time-quarter";
    w.operations.drilldown = { dimensionId: "time", targetLevelId: "time-month" };

    const original = createCubeView(w.dataset, { ...w, operation: { type: "original" } });
    expect(original.view).toBeNull();
    expect(original.errors.join(" ")).toContain("Not all Time facts");

    expect(canDrillDown(w.dataset, w.activeLevels, "time", "time-month")).toBe(false);
    const drilldown = createCubeView(w.dataset, {
      ...w,
      operation: { type: "drilldown", dimensionId: "time", targetLevelId: "time-month" },
    });
    expect(drilldown.view).toBeNull();
    expect(drilldown.errors.join(" ")).toContain("source-level data");
  });

  it("does not invent a leaf Roll-up source for an invalid active level", () => {
    const w = workspace();
    const time = w.dataset.dimensions[0];
    expect(rollupSourceLevel(time, "deleted-level")).toBeUndefined();
    expect(rollupSourceLevel(time, undefined)).toBeUndefined();
    expect(rollupSourceLevel(time, "")).toBeUndefined();

    w.activeLevels.time = "deleted-level";
    w.operations.rollup = { dimensionId: "time", sourceLevelId: "time-month", targetLevelId: "time-year" };
    const slide = buildPresentationSlides(w).find((entry) => entry.kind === "rollup")!;
    expect(slide.view).toBeNull();
    expect(slide.details.some((detail) => detail.includes("Unavailable level"))).toBe(true);
    expect(slide.details.join(" ")).not.toMatch(/Month\s*→/);
  });

  it("keeps the live cube usable while Sales drafts use a trailing decimal", () => {
    const w = workspace();
    const draft = setFactMeasureInput(w.dataset.facts[0], "sales", "1.");
    w.dataset.facts[0] = draft;
    expect(draft.measures.sales).toBeTypeOf("number");
    expect(validateDataset(w.dataset)).toEqual([]);
    expect(createCubeView(w.dataset, { ...w, operation: { type: "original" } }).view).not.toBeNull();
  });

  it("rejects missing or empty activeLevels instead of falling back to the leaf", () => {
    const w = workspace();
    delete w.activeLevels.product;
    expect(createCubeView(w.dataset, { ...w, operation: { type: "original" } }).errors.join(" "))
      .toContain("Original cube level is unavailable");

    w.activeLevels.product = "";
    expect(createCubeView(w.dataset, { ...w, operation: { type: "original" } }).errors.join(" "))
      .toContain("Original cube level is unavailable");
  });

  it("rejects measureInputs that disagree with stored measures", () => {
    const w = workspace();
    w.dataset.facts[0].measureInputs = { sales: "100" };
    w.dataset.facts[0].measures.sales = 50;
    expect(validateDataset(w.dataset).join(" ")).toMatch(/does not match/);
  });

  it("rejects non-finite or duplicate level orders", () => {
    const w = workspace();
    const time = w.dataset.dimensions[0];
    time.levels[1].order = Number.NaN;
    expect(validateDataset(w.dataset).join(" ")).toMatch(/non-finite level order/i);

    const duplicate = workspace();
    duplicate.dataset.dimensions[0].levels[1].order = duplicate.dataset.dimensions[0].levels[0].order;
    expect(validateDataset(duplicate.dataset).join(" ")).toMatch(/duplicate level order/i);
  });

  it("fails closed when Refresh Sales sees unknown leaf coordinates", () => {
    const w = workspace();
    const template = getIndustryTemplate("furniture-home")!;
    w.dataset.facts[0].coordinates.time = "not-a-month";
    expect(() => refreshSalesFacts(w.dataset, template, () => 0.3)).toThrow(/leaf member/i);
  });

  it("preserves Unicode characters in export filenames", () => {
    expect(safeFilename("全球销售分析")).toBe("全球销售分析");
    expect(safeFilename("OLAP 年度銷售分析")).toBe("OLAP-年度銷售分析");
    expect(safeFilename("a/b:c")).toBe("a-b-c");
    expect(safeFilename("   ")).toBe("olap-cube");
  });

  it("aligns presentation gating with full-slide SUM validation", () => {
    const w = workspace();
    w.dataset.facts.forEach((fact) => {
      fact.measures.sales = Number.MAX_VALUE;
    });
    const originalReq = { ...w, operation: { type: "original" as const } };
    expect(validateCubeRequest(w.dataset, originalReq)).toEqual([]);
    expect(validatePresentation(w).length).toBeGreaterThan(0);
  });
});
