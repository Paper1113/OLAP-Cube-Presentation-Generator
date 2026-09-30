import { describe, expect, it } from "vitest";
import { createCubeView } from "../../engine/cubeEngine";
import {
  createCubeGeometry,
  getCubeZAxisTitleX,
  measureCubeTextWidth,
} from "../../engine/cubeGeometry";
import { generateIndustryWorkspace } from "../../generator/datasetGenerator";
import { resolveCubeVisualTheme } from "../../theme/cubeAppearance";
import { createCubeSvgMarkup } from "./CubeSvg";

describe("cube SVG layout", () => {
  it("reserves vertical clearance between the SVG subtitle and a sliced Z-axis label", () => {
    const workspace = generateIndustryWorkspace({
      title: "Sample Sales Analysis",
      industryId: "beauty-personal-care",
      year: 2032,
      random: () => 0.5,
    });
    const result = createCubeView(workspace.dataset, {
      axisMapping: workspace.axisMapping,
      activeLevels: workspace.activeLevels,
      operation: { type: "slice", ...workspace.operations.slice },
    });
    expect(result.errors).toEqual([]);
    const view = result.view!;
    const geometry = createCubeGeometry(view);
    const zAxisTitleY = geometry.originY
      - Math.max(1, view.z.members.length) * geometry.options.depthY
      - 18;
    const svg = createCubeSvgMarkup(view);

    expect(zAxisTitleY).toBeGreaterThan(80);
    expect(svg).toContain(`y="${zAxisTitleY}"`);
    expect(svg).toContain("Location · Country");
  });

  it("keeps Z member labels above the cube faces and the Y title left of member labels", () => {
    const workspace = generateIndustryWorkspace({
      title: "Layout sample",
      industryId: "furniture-home",
      year: 2032,
      random: () => 0.5,
    });
    const result = createCubeView(workspace.dataset, {
      axisMapping: workspace.axisMapping,
      activeLevels: workspace.activeLevels,
      operation: { type: "original" },
    });
    const view = result.view!;
    const geometry = createCubeGeometry(view);
    const svg = createCubeSvgMarkup(view);

    const zLabelY = geometry.originY - geometry.options.depthY - 8;
    expect(svg).toContain(`y="${zLabelY}"`);
    expect(svg).toContain(`rotate(-90 24`);
  });

  it("keeps the final Z member label clear of the Z-axis title", () => {
    const workspace = generateIndustryWorkspace({
      title: "Layout sample",
      industryId: "furniture-home",
      year: 2032,
      random: () => 0.5,
    });
    const result = createCubeView(workspace.dataset, {
      axisMapping: workspace.axisMapping,
      activeLevels: workspace.activeLevels,
      operation: { type: "original" },
    });
    const view = result.view!;
    const geometry = createCubeGeometry(view);
    const svg = createCubeSvgMarkup(view);
    const expectedZAxisTitleX = getCubeZAxisTitleX(view, geometry.originX, geometry.options);

    expect(svg).toContain(`<text x="${expectedZAxisTitleX}"`);
  });

  it("measures wide glyphs before placing the final Z label and axis title", () => {
    const workspace = generateIndustryWorkspace({
      title: "ViewBox sample",
      industryId: "furniture-home",
      year: 2032,
      random: () => 0.5,
    });
    const result = createCubeView(workspace.dataset, {
      axisMapping: workspace.axisMapping,
      activeLevels: workspace.activeLevels,
      operation: { type: "original" },
    });
    const baseView = result.view!;
    const view = {
      ...baseView,
      cells: [],
      x: {
        ...baseView.x,
        members: baseView.x.members.slice(0, 1),
      },
      z: {
        ...baseView.z,
        dimensionName: "地域",
        levelName: "都市",
        members: Array.from({ length: 8 }, (_, index) => ({
          id: `stress-city-${index}`,
          label: index === 7 ? "界界界界界界界界界界界界界界界界" : `City ${index}`,
        })),
      },
    };
    const geometry = createCubeGeometry(view);
    const svg = createCubeSvgMarkup(view);
    const zAxisTitle = `${view.z.dimensionName} · ${view.z.levelName} ↗`;
    const zAxisTitleX = getCubeZAxisTitleX(view, geometry.originX, geometry.options);
    const zAxisTitleWidth = measureCubeTextWidth(zAxisTitle, {
      fontFamily: geometry.options.fontFamily,
      fontSize: 14,
      fontWeight: 700,
    });
    const legacyWidth = Math.max(
      520,
      geometry.originX
        + view.x.members.length * (geometry.options.cellWidth + geometry.options.spacing)
        + view.z.members.length * geometry.options.depthX
        + 90,
    );

    expect(geometry.width).toBeGreaterThan(legacyWidth);
    expect(geometry.width).toBeGreaterThanOrEqual(
      zAxisTitleX + zAxisTitleWidth + 24,
    );
    expect(svg).toContain(`viewBox="${geometry.viewBox}"`);
  });

  it("applies the selected palette and drawing style to SVG output", () => {
    const workspace = generateIndustryWorkspace({
      title: "Styled sample",
      industryId: "furniture-home",
      year: 2032,
      random: () => 0.5,
    });
    const result = createCubeView(workspace.dataset, {
      axisMapping: workspace.axisMapping,
      activeLevels: workspace.activeLevels,
      operation: { type: "original" },
    });
    const appearance = { paletteId: "coral", styleId: "bold" } as const;
    const theme = resolveCubeVisualTheme(appearance);
    const svg = createCubeSvgMarkup(result.view!, { appearance });

    expect(svg).toContain(`fill="${theme.frontFill}"`);
    expect(svg).toContain(`stroke="${theme.stroke}"`);
    expect(svg).toContain(`stroke-width="${theme.strokeWidth}"`);
    expect(svg).toContain(`fill="${theme.markerFill}"`);
  });

  it("keeps title-free diagrams compact for presentation exports", () => {
    const workspace = generateIndustryWorkspace({ title: "Sample", industryId: "furniture-home", year: 2032 });
    const result = createCubeView(workspace.dataset, {
      axisMapping: workspace.axisMapping,
      activeLevels: workspace.activeLevels,
      operation: { type: "original" },
    });
    const view = result.view!;
    const compactGeometry = createCubeGeometry(view, { topPadding: 100 });
    const svg = createCubeSvgMarkup(view, { includeTitle: false });

    expect(svg).toContain(`viewBox="${compactGeometry.viewBox}"`);
    expect(svg).not.toContain("Sample · Sales (SUM)");
  });
});
