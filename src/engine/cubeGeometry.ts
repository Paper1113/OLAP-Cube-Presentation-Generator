import type { CubeViewModel } from "../models/cube";

export interface CubeGeometryOptions {
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
  cellWidth: 90,
  cellHeight: 62,
  depthX: 29,
  depthY: 23,
  spacing: 5,
  fontSize: 13,
};

export const createCubeGeometry = (
  view: CubeViewModel,
  overrides: Partial<CubeGeometryOptions> = {},
): CubeGeometry => {
  const options = { ...defaultCubeGeometryOptions, ...overrides };
  const xStep = options.cellWidth + options.spacing;
  const yStep = options.cellHeight + options.spacing;
  const originX = 130;
  const originY = 100 + Math.max(0, view.z.members.length - 1) * options.depthY;
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

  const width = Math.max(
    520,
    originX + view.x.members.length * xStep + view.z.members.length * options.depthX + 90,
  );
  const height = Math.max(360, originY + view.y.members.length * yStep + 118);
  return { options, originX, originY, cells, width, height, viewBox: `0 0 ${width} ${height}` };
};
