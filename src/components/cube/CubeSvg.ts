import type { CubeViewModel } from "../../models/cube";
import { createCubeGeometry, type CubeGeometryOptions } from "../../engine/cubeGeometry";
import {
  resolveCubeVisualTheme,
  type CubeAppearance,
} from "../../theme/cubeAppearance";
import { cubeAxesMarkup } from "./CubeAxis";
import { cubeCellMarkup } from "./CubeCell";
import { escapeSvgText } from "./CubeLabels";

export interface CubeSvgOptions {
  id?: string;
  geometry?: Partial<CubeGeometryOptions>;
  includeTitle?: boolean;
  appearance?: CubeAppearance;
}

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
  const cellsMarkup = orderedCells.map((cell) => {
    const cellGeometry = geometryByCoordinate.get(`${xIndex.get(cell.xMemberId) ?? 0}:${yIndex.get(cell.yMemberId) ?? 0}:${zIndex.get(cell.zMemberId) ?? 0}`);
    return cellGeometry ? cubeCellMarkup(cell, cellGeometry, geometry.options, view.measure.name, theme) : "";
  }).join("");
  const title = `${view.operationLabel}: ${view.datasetTitle}`;
  const fontFamily = escapeSvgText(theme.fontFamily);

  return `<svg${options.id ? ` id="${escapeSvgText(options.id)}"` : ""} xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="cube-title cube-description" viewBox="${geometry.viewBox}" width="${geometry.width}" height="${geometry.height}">
    <title id="cube-title">${escapeSvgText(title)}</title>
    <desc id="cube-description">${escapeSvgText(view.description)}</desc>
    <rect width="100%" height="100%" fill="${theme.background}" />
    <defs><marker id="axis-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="${theme.markerFill}" /></marker></defs>
    ${includeTitle ? `<text x="24" y="34" font-family="${fontFamily}" font-size="19" font-weight="700" fill="${theme.titleFill}">${escapeSvgText(view.operationLabel)}</text><text x="24" y="56" font-family="${fontFamily}" font-size="12" fill="${theme.subtitleFill}">${escapeSvgText(`${view.datasetTitle} · ${view.measure.name} (SUM)`)}</text>` : ""}
    ${cellsMarkup}
    ${cubeAxesMarkup(view, geometry, theme)}
  </svg>`;
};
