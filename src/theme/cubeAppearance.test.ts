import { describe, expect, it } from "vitest";
import {
  cubeDrawingStyles,
  cubePalettes,
  DEFAULT_CUBE_APPEARANCE,
  normalizeCubeAppearance,
  resolveCubeVisualTheme,
  type CubeAppearance,
} from "./cubeAppearance";

describe("cube appearance presets", () => {
  it("provides unique preset palettes and four drawing styles", () => {
    expect(cubePalettes).toHaveLength(8);
    expect(new Set(cubePalettes.map((palette) => palette.id)).size).toBe(cubePalettes.length);
    expect(cubeDrawingStyles).toHaveLength(4);
    expect(new Set(cubeDrawingStyles.map((style) => style.id)).size).toBe(cubeDrawingStyles.length);
  });

  it("falls back safely when an older or invalid saved appearance is loaded", () => {
    const invalid = { paletteId: "missing", styleId: "missing" } as unknown as CubeAppearance;
    expect(normalizeCubeAppearance(invalid)).toEqual(DEFAULT_CUBE_APPEARANCE);
    expect(normalizeCubeAppearance(undefined)).toEqual(DEFAULT_CUBE_APPEARANCE);
  });

  it("resolves visibly different wireframe and bold treatments", () => {
    const wireframe = resolveCubeVisualTheme({ paletteId: "rose", styleId: "wireframe" });
    const bold = resolveCubeVisualTheme({ paletteId: "rose", styleId: "bold" });

    expect(wireframe.frontFill).toBe("none");
    expect(wireframe.sideStrokeDasharray).toBe("4 2");
    expect(bold.frontFill).toBe(bold.palette.primary);
    expect(bold.valueFill).toBe(bold.palette.onPrimary);
    expect(bold.strokeWidth).toBeGreaterThan(wireframe.strokeWidth);
  });
});
