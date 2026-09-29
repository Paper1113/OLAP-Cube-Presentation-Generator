import { describe, expect, it } from "vitest";
import {
  cubeDrawingStyles,
  cubePalettes,
  DEFAULT_CUBE_APPEARANCE,
  normalizeCubeAppearance,
  randomCubeAppearance,
  resolveCubeVisualTheme,
  type CubeAppearance,
} from "./cubeAppearance";

const relativeLuminance = (hex: string): number => {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

const contrastRatio = (foreground: string, background: string): number => {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
};

describe("cube appearance presets", () => {
  it("provides unique preset palettes and four drawing styles", () => {
    expect(cubePalettes).toHaveLength(8);
    expect(new Set(cubePalettes.map((palette) => palette.id)).size).toBe(cubePalettes.length);
    expect(cubeDrawingStyles).toHaveLength(4);
    expect(new Set(cubeDrawingStyles.map((style) => style.id)).size).toBe(cubeDrawingStyles.length);
  });

  it("keeps bold value labels at WCAG AA contrast across every palette", () => {
    cubePalettes.forEach((palette) => {
      expect(contrastRatio(palette.onPrimary, palette.primary)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("randomizes both palette and style away from the current appearance", () => {
    const current: CubeAppearance = { paletteId: "ocean", styleId: "classic" };
    const first = randomCubeAppearance(current, () => 0);
    const last = randomCubeAppearance(current, () => 0.999999);

    expect(first.paletteId).not.toBe(current.paletteId);
    expect(first.styleId).not.toBe(current.styleId);
    expect(last.paletteId).not.toBe(current.paletteId);
    expect(last.styleId).not.toBe(current.styleId);
    expect(first).not.toEqual(last);
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
