import type { CubeViewModel } from "../models/cube";

export interface CubeGeometryOptions {
  /** Reserved vertical space above the cube for an optional SVG heading. */
  topPadding: number;
  cellWidth: number;
  cellHeight: number;
  depthX: number;
  depthY: number;
  spacing: number;
  fontSize: number;
  fontFamily: string;
}

export interface CubeCellGeometry {
  xIndex: number;
  yIndex: number;
  zIndex: number;
  frontX: number;
  frontY: number;
}

export interface CubeGeometry {
  options: CubeGeometryOptions;
  originX: number;
  originY: number;
  cells: CubeCellGeometry[];
  width: number;
  height: number;
  viewBox: string;
}

export const defaultCubeGeometryOptions: CubeGeometryOptions = {
  topPadding: 132,
  cellWidth: 90,
  cellHeight: 62,
  depthX: 29,
  depthY: 23,
  spacing: 5,
  fontSize: 13,
  fontFamily: "Aptos, Arial, sans-serif",
};

const maxMemberLabelLength = 16;
const memberLabelFontSize = 12;
const axisTitleFontSize = 14;
const axisTitleFontWeight = 700;
const axisTitleRightPadding = 24;

export interface CubeTextMeasureOptions {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
}

const shortenMemberLabel = (label: string): string =>
  label.length > maxMemberLabelLength ? `${label.slice(0, maxMemberLabelLength - 1)}…` : label;

const fallbackTextWidth = (text: string, fontSize: number): number =>
  Array.from(text).length * fontSize;

/** Measure the same font used by the SVG, with a conservative non-DOM fallback for tests. */
export const measureCubeTextWidth = (
  text: string,
  { fontFamily, fontSize, fontWeight = 400 }: CubeTextMeasureOptions,
): number => {
  const fallback = fallbackTextWidth(text, fontSize);
  if (typeof document === "undefined") return fallback;

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return fallback;

    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const measured = context.measureText(text).width;
    return Number.isFinite(measured) ? Math.ceil(measured + 1) : fallback;
  } catch {
    return fallback;
  }
};

/** Pixel-based ellipsis shared by all SVG text; full text remains in a title tooltip. */
export const fitCubeText = (text: string, maxWidth: number, options: CubeTextMeasureOptions): string => {
  if (measureCubeTextWidth(text, options) <= maxWidth) return text;
  const characters = Array.from(text);
  while (characters.length && measureCubeTextWidth(`${characters.join("")}…`, options) > maxWidth) characters.pop();
  return `${characters.join("")}…`;
};

export const getCubeZAxisTitleX = (
  view: Pick<CubeViewModel, "z">,
  originX: number,
  options: Pick<CubeGeometryOptions, "depthX" | "fontFamily">,
): number => {
  const zCount = Math.max(1, view.z.members.length);
  const zEndX = originX + zCount * options.depthX + 13;
  const lastZMemberIndex = Math.max(0, view.z.members.length - 1);
  const finalZLabelX = originX + lastZMemberIndex * options.depthX + 3;
  const finalZLabel = shortenMemberLabel(view.z.members[lastZMemberIndex]?.label ?? "");
  const finalZLabelWidth = measureCubeTextWidth(finalZLabel, {
    fontFamily: options.fontFamily,
    fontSize: memberLabelFontSize,
  });

  return Math.max(
    zEndX + 8,
    finalZLabelX + finalZLabelWidth + 12,
  );
};

export const createCubeGeometry = (
  view: CubeViewModel,
  overrides: Partial<CubeGeometryOptions> = {},
): CubeGeometry => {
  const options = { ...defaultCubeGeometryOptions, ...overrides };
  const xStep = options.cellWidth + options.spacing;
  const yStep = options.cellHeight + options.spacing;
  const originX = 130;
  const originY = options.topPadding + Math.max(0, view.z.members.length - 1) * options.depthY;
  const cells: CubeCellGeometry[] = [];

  view.x.members.forEach((xMember, xIndex) => {
    view.y.members.forEach((yMember, yIndex) => {
      view.z.members.forEach((zMember, zIndex) => {
        void xMember;
        void yMember;
        void zMember;
        cells.push({
          xIndex,
          yIndex,
          zIndex,
          frontX: originX + xIndex * xStep + zIndex * options.depthX,
          frontY: originY + yIndex * yStep - zIndex * options.depthY,
        });
      });
    });
  });

  const zAxisTitle = `${view.z.dimensionName} · ${view.z.levelName} ↗`;
  const zAxisTitleX = getCubeZAxisTitleX(view, originX, options);
  const zAxisTitleWidth = Math.min(320, measureCubeTextWidth(zAxisTitle, {
    fontFamily: options.fontFamily,
    fontSize: axisTitleFontSize,
    fontWeight: axisTitleFontWeight,
  }));
  const width = Math.max(
    520,
    originX + view.x.members.length * xStep + view.z.members.length * options.depthX + 90,
    zAxisTitleX + zAxisTitleWidth + axisTitleRightPadding,
  );
  const height = Math.max(360, originY + view.y.members.length * yStep + 118);
  return { options, originX, originY, cells, width, height, viewBox: `0 0 ${width} ${height}` };
};
