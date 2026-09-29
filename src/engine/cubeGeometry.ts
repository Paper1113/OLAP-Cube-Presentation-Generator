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
};

const maxMemberLabelLength = 16;
const memberLabelCharacterWidth = 7.5;
const axisTitleCharacterWidth = 9;
const axisTitleRightPadding = 24;

/** Conservative SVG text-width estimates used to keep labels inside the viewBox. */
export const estimateCubeMemberLabelWidth = (label: string): number =>
  Math.ceil(Math.min(label.length, maxMemberLabelLength) * memberLabelCharacterWidth);

export const estimateCubeAxisTitleWidth = (title: string): number =>
  Math.ceil(title.length * axisTitleCharacterWidth);

export const getCubeZAxisTitleX = (
  view: Pick<CubeViewModel, "z">,
  originX: number,
  depthX: number,
): number => {
  const zCount = Math.max(1, view.z.members.length);
  const zEndX = originX + zCount * depthX + 13;
  const lastZMemberIndex = Math.max(0, view.z.members.length - 1);
  const finalZLabelX = originX + lastZMemberIndex * depthX + 3;
  const finalZLabel = view.z.members[lastZMemberIndex]?.label ?? "";

  return Math.max(
    zEndX + 8,
    finalZLabelX + estimateCubeMemberLabelWidth(finalZLabel) + 12,
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
  const zAxisTitleX = getCubeZAxisTitleX(view, originX, options.depthX);
  const width = Math.max(
    520,
    originX + view.x.members.length * xStep + view.z.members.length * options.depthX + 90,
    zAxisTitleX + estimateCubeAxisTitleWidth(zAxisTitle) + axisTitleRightPadding,
  );
  const height = Math.max(360, originY + view.y.members.length * yStep + 118);
  return { options, originX, originY, cells, width, height, viewBox: `0 0 ${width} ${height}` };
};
