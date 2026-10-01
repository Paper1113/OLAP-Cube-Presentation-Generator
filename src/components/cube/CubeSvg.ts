import type { CubeViewModel } from "../../models/cube";
import {
  createCubeGeometry,
  fitCubeText,
  measureCubeTextWidth,
  type CubeCellGeometry,
  type CubeGeometryOptions,
} from "../../engine/cubeGeometry";
import {
  resolveCubeVisualTheme,
  type CubeAppearance,
} from "../../theme/cubeAppearance";
import { cubeAxesMarkup } from "./CubeAxis";
import {
  cubeCellMarkup,
  cubeCellValueFontSize,
  cubeCellValueLabel,
  cubeCellValueMarkup,
  cubeCellValuePosition,
  cubeCellValueStrokeWidth,
} from "./CubeCell";
import { escapeSvgText, fittedSvgText } from "./CubeLabels";

export interface CubeSvgOptions {
  id?: string;
  geometry?: Partial<CubeGeometryOptions>;
  includeTitle?: boolean;
  appearance?: CubeAppearance;
}

interface OrderedValueCell {
  cell: CubeViewModel["cells"][number];
  geometry: CubeCellGeometry;
}

interface ValueLabelBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface CubePoint {
  x: number;
  y: number;
}

const valueLabelBounds = (
  valueCell: OrderedValueCell,
  options: CubeGeometryOptions,
  theme: ReturnType<typeof resolveCubeVisualTheme>,
): ValueLabelBounds => {
  const fontSize = cubeCellValueFontSize(valueCell.geometry, options);
  const position = cubeCellValuePosition(valueCell.geometry, options);
  const label = fitCubeText(cubeCellValueLabel(valueCell.cell), options.cellWidth - 10, {
    fontFamily: options.fontFamily,
    fontSize,
    fontWeight: theme.valueFontWeight,
  });
  const width = measureCubeTextWidth(label, {
    fontFamily: options.fontFamily,
    fontSize,
    fontWeight: theme.valueFontWeight,
  });
  const padding = cubeCellValueStrokeWidth(options) + 1;
  return {
    left: position.x - width / 2 - padding,
    right: position.x + width / 2 + padding,
    top: position.y - fontSize - padding,
    bottom: position.y + padding,
  };
};

const boundsOverlap = (left: ValueLabelBounds, right: ValueLabelBounds): boolean =>
  left.left < right.right
  && left.right > right.left
  && left.top < right.bottom
  && left.bottom > right.top;

const rectanglePoints = (bounds: ValueLabelBounds): CubePoint[] => [
  { x: bounds.left, y: bounds.top },
  { x: bounds.right, y: bounds.top },
  { x: bounds.right, y: bounds.bottom },
  { x: bounds.left, y: bounds.bottom },
];

const facePolygons = (
  valueCell: OrderedValueCell,
  options: CubeGeometryOptions,
): CubePoint[][] => {
  const { frontX, frontY } = valueCell.geometry;
  const { cellWidth, cellHeight, depthX, depthY } = options;
  return [
    [
      { x: frontX, y: frontY },
      { x: frontX + depthX, y: frontY - depthY },
      { x: frontX + cellWidth + depthX, y: frontY - depthY },
      { x: frontX + cellWidth, y: frontY },
    ],
    [
      { x: frontX + cellWidth, y: frontY },
      { x: frontX + cellWidth + depthX, y: frontY - depthY },
      { x: frontX + cellWidth + depthX, y: frontY + cellHeight - depthY },
      { x: frontX + cellWidth, y: frontY + cellHeight },
    ],
    [
      { x: frontX, y: frontY },
      { x: frontX + cellWidth, y: frontY },
      { x: frontX + cellWidth, y: frontY + cellHeight },
      { x: frontX, y: frontY + cellHeight },
    ],
  ];
};

const polygonAxes = (polygon: CubePoint[]): CubePoint[] => polygon.map((point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  return { x: next.y - point.y, y: point.x - next.x };
});

const projectPolygon = (polygon: CubePoint[], axis: CubePoint): { min: number; max: number } => {
  const projections = polygon.map((point) => point.x * axis.x + point.y * axis.y);
  return { min: Math.min(...projections), max: Math.max(...projections) };
};

const polygonsOverlap = (left: CubePoint[], right: CubePoint[]): boolean => {
  const axes = [...polygonAxes(left), ...polygonAxes(right)];
  return axes.every((axis) => {
    const leftProjection = projectPolygon(left, axis);
    const rightProjection = projectPolygon(right, axis);
    return leftProjection.min < rightProjection.max && rightProjection.min < leftProjection.max;
  });
};

const labelOverlapsLaterFace = (
  bounds: ValueLabelBounds,
  laterCells: OrderedValueCell[],
  options: CubeGeometryOptions,
): boolean => {
  const labelPolygon = rectanglePoints(bounds);
  return laterCells.some((laterCell) => facePolygons(laterCell, options)
    .some((face) => polygonsOverlap(labelPolygon, face)));
};

/**
 * Keep value labels in the same painter order as the cube faces. A label that
 * would be covered by a later cell face is omitted first; remaining labels
 * that collide still let the later-drawn (front-most) cell win. Every cell
 * retains its accessible title and underlying value.
 */
const visibleValueCells = (
  orderedValueCells: OrderedValueCell[],
  options: CubeGeometryOptions,
  theme: ReturnType<typeof resolveCubeVisualTheme>,
): OrderedValueCell[] => {
  const visible: Array<OrderedValueCell & { bounds: ValueLabelBounds }> = [];

  orderedValueCells.forEach((valueCell, valueIndex) => {
    const bounds = valueLabelBounds(valueCell, options, theme);
    if (labelOverlapsLaterFace(bounds, orderedValueCells.slice(valueIndex + 1), options)) return;

    const collisions = visible.filter((candidate) => boundsOverlap(candidate.bounds, bounds));
    if (collisions.length > 0) {
      for (const collision of collisions) {
        const index = visible.indexOf(collision);
        if (index >= 0) visible.splice(index, 1);
      }
    }
    visible.push({ ...valueCell, bounds });
  });

  return visible;
};

export const createCubeSvgMarkup = (view: CubeViewModel, options: CubeSvgOptions = {}): string => {
  const includeTitle = options.includeTitle !== false;
  const theme = resolveCubeVisualTheme(options.appearance);
  const geometry = createCubeGeometry(view, {
    ...options.geometry,
    ...(!includeTitle && options.geometry?.topPadding === undefined ? { topPadding: 100 } : {}),
    fontFamily: theme.fontFamily,
  });
  const geometryByCoordinate = new Map(
    geometry.cells.map((cell) => [`${cell.xIndex}:${cell.yIndex}:${cell.zIndex}`, cell]),
  );
  const xIndex = new Map(view.x.members.map((member, index) => [member.id, index]));
  const yIndex = new Map(view.y.members.map((member, index) => [member.id, index]));
  const zIndex = new Map(view.z.members.map((member, index) => [member.id, index]));

  const orderedCells = [...view.cells].sort((left, right) => {
    const leftZ = zIndex.get(left.zMemberId) ?? 0;
    const rightZ = zIndex.get(right.zMemberId) ?? 0;
    if (leftZ !== rightZ) return rightZ - leftZ;
    const leftY = yIndex.get(left.yMemberId) ?? 0;
    const rightY = yIndex.get(right.yMemberId) ?? 0;
    return rightY - leftY;
  });
  const orderedValueCells = orderedCells.flatMap((cell): OrderedValueCell[] => {
    const cellGeometry = geometryByCoordinate.get(`${xIndex.get(cell.xMemberId) ?? 0}:${yIndex.get(cell.yMemberId) ?? 0}:${zIndex.get(cell.zMemberId) ?? 0}`);
    return cellGeometry ? [{ cell, geometry: cellGeometry }] : [];
  });
  const cellsMarkup = orderedValueCells
    .map(({ cell, geometry: cellGeometry }) => cubeCellMarkup(cell, cellGeometry, geometry.options, view.measure.name, theme, false))
    .join("");
  const valueMarkup = visibleValueCells(orderedValueCells, geometry.options, theme)
    .map(({ cell, geometry: cellGeometry }) => cubeCellValueMarkup(cell, cellGeometry, geometry.options, theme))
    .join("");
  const title = `${view.operationLabel}: ${view.datasetTitle}`;
  const fontFamily = escapeSvgText(theme.fontFamily);

  return `<svg${options.id ? ` id="${escapeSvgText(options.id)}"` : ""} xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="cube-title cube-description" viewBox="${geometry.viewBox}" width="${geometry.width}" height="${geometry.height}">
    <title id="cube-title">${escapeSvgText(title)}</title>
    <desc id="cube-description">${escapeSvgText(view.description)}</desc>
    <rect width="100%" height="100%" fill="${theme.background}" />
    <defs><marker id="axis-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="${theme.markerFill}" /></marker></defs>
    ${includeTitle ? `<text x="24" y="34" font-family="${fontFamily}" font-size="19" font-weight="700" fill="${theme.titleFill}">${fittedSvgText(view.operationLabel, geometry.width - 48, { fontFamily: theme.fontFamily, fontSize: 19, fontWeight: 700 })}</text><text x="24" y="56" font-family="${fontFamily}" font-size="12" fill="${theme.subtitleFill}">${fittedSvgText(`${view.datasetTitle} · ${view.measure.name} (SUM)`, geometry.width - 48, { fontFamily: theme.fontFamily, fontSize: 12 })}</text>` : ""}
    ${cellsMarkup}
    <g class="cube-values">${valueMarkup}</g>
    ${cubeAxesMarkup(view, geometry, theme)}
  </svg>`;
};
