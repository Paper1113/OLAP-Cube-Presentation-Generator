export type CubePaletteId =
  | "ocean"
  | "emerald"
  | "violet"
  | "amber"
  | "rose"
  | "teal"
  | "slate"
  | "coral";

export type CubeDrawingStyleId = "classic" | "minimal" | "wireframe" | "bold";

export interface CubeAppearance {
  paletteId: CubePaletteId;
  styleId: CubeDrawingStyleId;
}

export interface CubePaletteDefinition {
  id: CubePaletteId;
  label: string;
  primary: string;
  onPrimary: string;
}

export interface CubeDrawingStyleDefinition {
  id: CubeDrawingStyleId;
  label: string;
  description: string;
}

export interface ResolvedCubeTheme {
  appearance: CubeAppearance;
  palette: CubePaletteDefinition;
  background: string;
  frontFill: string;
  topFill: string;
  rightFill: string;
  emptyFrontFill: string;
  emptyTopFill: string;
  emptyRightFill: string;
  stroke: string;
  strokeWidth: number;
  sideStrokeDasharray?: string;
  valueFill: string;
  emptyValueFill: string;
  valueFontWeight: number;
  axisStroke: string;
  axisStrokeWidth: number;
  axisStrokeDasharray?: string;
  memberText: string;
  axisTitle: string;
  titleFill: string;
  subtitleFill: string;
  markerFill: string;
}

export const cubePalettes: readonly CubePaletteDefinition[] = [
  { id: "ocean", label: "Ocean", primary: "#2f7ea8", onPrimary: "#000000" },
  { id: "emerald", label: "Emerald", primary: "#318267", onPrimary: "#ffffff" },
  { id: "violet", label: "Violet", primary: "#7060a8", onPrimary: "#ffffff" },
  { id: "amber", label: "Amber", primary: "#d18a24", onPrimary: "#17212a" },
  { id: "rose", label: "Rose", primary: "#bd5b73", onPrimary: "#000000" },
  { id: "teal", label: "Teal", primary: "#2d8585", onPrimary: "#000000" },
  { id: "slate", label: "Slate", primary: "#647180", onPrimary: "#ffffff" },
  { id: "coral", label: "Coral", primary: "#c9684f", onPrimary: "#000000" },
];

export const cubeDrawingStyles: readonly CubeDrawingStyleDefinition[] = [
  { id: "classic", label: "Classic", description: "Filled isometric faces with balanced outlines." },
  { id: "minimal", label: "Minimal", description: "Light surfaces, fine strokes, and a cleaner presentation look." },
  { id: "wireframe", label: "Wireframe", description: "Outline-first technical styling with dashed depth faces." },
  { id: "bold", label: "Bold", description: "Saturated front faces, stronger contrast, and heavier outlines." },
];

export const DEFAULT_CUBE_APPEARANCE: CubeAppearance = {
  paletteId: "ocean",
  styleId: "classic",
};

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

const mixHex = (base: string, mixWith: string, ratio: number): string => {
  const parse = (hex: string) => Number.parseInt(hex.replace("#", ""), 16);
  const baseValue = parse(base);
  const mixValue = parse(mixWith);
  const amount = clamp(ratio);
  const channel = (shift: number) => {
    const from = (baseValue >> shift) & 0xff;
    const to = (mixValue >> shift) & 0xff;
    return Math.round(from + (to - from) * amount);
  };
  const value = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${value.toString(16).padStart(6, "0")}`;
};

export const normalizeCubeAppearance = (
  appearance?: Partial<CubeAppearance> | null,
): CubeAppearance => {
  const paletteId = cubePalettes.some((palette) => palette.id === appearance?.paletteId)
    ? appearance!.paletteId!
    : DEFAULT_CUBE_APPEARANCE.paletteId;
  const styleId = cubeDrawingStyles.some((style) => style.id === appearance?.styleId)
    ? appearance!.styleId!
    : DEFAULT_CUBE_APPEARANCE.styleId;
  return { paletteId, styleId };
};

export const randomCubeAppearance = (
  current?: Partial<CubeAppearance> | null,
  random: () => number = Math.random,
): CubeAppearance => {
  const normalizedCurrent = normalizeCubeAppearance(current);
  const candidates = cubePalettes.flatMap((palette) =>
    cubeDrawingStyles
      .filter((style) =>
        !current
        || (palette.id !== normalizedCurrent.paletteId && style.id !== normalizedCurrent.styleId),
      )
      .map((style) => ({ paletteId: palette.id, styleId: style.id })),
  );
  const pool = candidates.length > 0
    ? candidates
    : cubePalettes.flatMap((palette) =>
        cubeDrawingStyles.map((style) => ({ paletteId: palette.id, styleId: style.id })),
      );
  const index = Math.min(pool.length - 1, Math.floor(clamp(random()) * pool.length));
  return pool[index];
};

export const resolveCubeVisualTheme = (
  appearance?: Partial<CubeAppearance> | null,
): ResolvedCubeTheme => {
  const normalized = normalizeCubeAppearance(appearance);
  const palette = cubePalettes.find((candidate) => candidate.id === normalized.paletteId) ?? cubePalettes[0];
  const dark = mixHex(palette.primary, "#000000", 0.42);
  const mediumDark = mixHex(palette.primary, "#000000", 0.25);
  const soft = mixHex(palette.primary, "#ffffff", 0.72);
  const softer = mixHex(palette.primary, "#ffffff", 0.86);
  const side = mixHex(palette.primary, "#ffffff", 0.54);

  const shared = {
    appearance: normalized,
    palette,
    background: "#ffffff",
    emptyFrontFill: "#f5f7f8",
    emptyTopFill: "#fbfcfd",
    emptyRightFill: "#e8edf0",
    emptyValueFill: "#60717b",
    titleFill: dark,
    subtitleFill: mixHex(dark, "#ffffff", 0.22),
    memberText: mediumDark,
    axisTitle: dark,
    markerFill: mediumDark,
  };

  switch (normalized.styleId) {
    case "minimal":
      return {
        ...shared,
        frontFill: softer,
        topFill: "#ffffff",
        rightFill: soft,
        stroke: palette.primary,
        strokeWidth: 0.9,
        valueFill: dark,
        valueFontWeight: 650,
        axisStroke: palette.primary,
        axisStrokeWidth: 1.1,
      };
    case "wireframe":
      return {
        ...shared,
        frontFill: "none",
        topFill: "none",
        rightFill: "none",
        emptyFrontFill: "none",
        emptyTopFill: "none",
        emptyRightFill: "none",
        stroke: palette.primary,
        strokeWidth: 1.65,
        sideStrokeDasharray: "4 2",
        valueFill: dark,
        valueFontWeight: 700,
        axisStroke: palette.primary,
        axisStrokeWidth: 1.45,
        axisStrokeDasharray: "6 3",
      };
    case "bold":
      return {
        ...shared,
        frontFill: palette.primary,
        topFill: mixHex(palette.primary, "#ffffff", 0.2),
        rightFill: mixHex(palette.primary, "#000000", 0.15),
        stroke: dark,
        strokeWidth: 2.05,
        valueFill: palette.onPrimary,
        valueFontWeight: 800,
        axisStroke: dark,
        axisStrokeWidth: 2,
      };
    default:
      return {
        ...shared,
        frontFill: soft,
        topFill: softer,
        rightFill: side,
        stroke: dark,
        strokeWidth: 1.2,
        valueFill: dark,
        valueFontWeight: 700,
        axisStroke: mediumDark,
        axisStrokeWidth: 1.5,
      };
  }
};
