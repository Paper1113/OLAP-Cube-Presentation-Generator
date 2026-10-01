import type { CubeAxisView } from "../../models/cube";
import {
  fitCubeText,
  getCubeZAxisTitleX,
  cubeZMemberLabelMaxWidth,
  type CubeGeometry,
} from "../../engine/cubeGeometry";
import type { ResolvedCubeTheme } from "../../theme/cubeAppearance";
import { escapeSvgText, fittedSvgText } from "./CubeLabels";

export const cubeAxesMarkup = (
  view: { x: CubeAxisView; y: CubeAxisView; z: CubeAxisView },
  geometry: CubeGeometry,
  theme: ResolvedCubeTheme,
): string => {
  const { options, originX, originY } = geometry;
  const xStep = options.cellWidth + options.spacing;
  const yStep = options.cellHeight + options.spacing;
  const xBottom = originY + view.y.members.length * yStep + 10;
  const xEnd = originX + view.x.members.length * xStep + 15;
  const yStart = originY + view.y.members.length * yStep;
  const zEndX = originX + Math.max(1, view.z.members.length) * options.depthX + 13;
  const zEndY = originY - Math.max(1, view.z.members.length) * options.depthY - 13;
  // Keep the rotated title to the left of member labels and fit its text to
  // the available vertical axis length.
  const yAxisTitle = `${view.y.dimensionName} · ${view.y.levelName} ↑`;
  const yAxisTextOptions = { fontFamily: theme.fontFamily, fontSize: 14, fontWeight: 700 } as const;
  const yAxisTitleX = Math.max(24, originX - 106);
  const zAxisTitleX = getCubeZAxisTitleX(view, originX, options);
  const axisDash = theme.axisStrokeDasharray ? ` stroke-dasharray="${theme.axisStrokeDasharray}"` : "";
  const lineCap = theme.strokeLinecap ? ` stroke-linecap="${theme.strokeLinecap}"` : "";
  const lineJoin = theme.strokeLinejoin ? ` stroke-linejoin="${theme.strokeLinejoin}"` : "";
  const fontFamily = escapeSvgText(theme.fontFamily);

  const memberText = (text: string, width: number) => fittedSvgText(text, width, { fontFamily: theme.fontFamily, fontSize: 12 });
  const axisText = (text: string, width: number) => {
    const fitted = fitCubeText(text, width, yAxisTextOptions);
    const fullText = escapeSvgText(text);
    return {
      fitted: escapeSvgText(fitted),
      metadata: ` aria-label="${fullText}" data-full-text="${fullText}"`,
    };
  };
  const xAxisTitle = `${view.x.dimensionName} · ${view.x.levelName} →`;
  const xAxisText = axisText(xAxisTitle, xEnd - originX);
  const yAxisText = axisText(yAxisTitle, Math.min(180, Math.max(48, yStart - originY - 12)));
  const zAxisTitle = `${view.z.dimensionName} · ${view.z.levelName} ↗`;
  const zAxisText = axisText(zAxisTitle, Math.min(320, geometry.width - zAxisTitleX - 24));

  const xLabels = view.x.members.map((member, index) =>
    `<text x="${originX + index * xStep + options.cellWidth / 2}" y="${xBottom + 27}" text-anchor="middle" class="member-label">${memberText(member.label, options.cellWidth - 8)}</text>`,
  ).join("");
  const yLabels = view.y.members.map((member, index) =>
    `<text x="${originX - 14}" y="${originY + index * yStep + options.cellHeight / 2 + 4}" text-anchor="end" class="member-label">${memberText(member.label, 78)}</text>`,
  ).join("");
  const zLabels = view.z.members.map((member, index) =>
    `<text x="${originX + index * options.depthX + 3}" y="${originY - index * options.depthY - options.depthY - 8}" text-anchor="start" class="member-label">${memberText(member.label, cubeZMemberLabelMaxWidth)}</text>`,
  ).join("");

  return `<g class="cube-axes" fill="none" stroke="${theme.axisStroke}" stroke-width="${theme.axisStrokeWidth}" marker-end="url(#axis-arrow)"${axisDash}${lineCap}${lineJoin}>
    <line x1="${originX}" y1="${xBottom}" x2="${xEnd}" y2="${xBottom}" />
    <line x1="${originX - 20}" y1="${yStart}" x2="${originX - 20}" y2="${originY - 12}" />
    <line x1="${originX}" y1="${originY}" x2="${zEndX}" y2="${zEndY}" />
  </g>
  <g font-family="${fontFamily}" font-size="12" fill="${theme.memberText}">${xLabels}${yLabels}${zLabels}</g>
  <g font-family="${fontFamily}" font-size="14" font-weight="700" fill="${theme.axisTitle}">
    <text x="${(originX + xEnd) / 2}" y="${xBottom + 54}" text-anchor="middle"${xAxisText.metadata}>${xAxisText.fitted}</text>
    <text x="${yAxisTitleX}" y="${(originY + yStart) / 2}" text-anchor="middle" transform="rotate(-90 ${yAxisTitleX} ${(originY + yStart) / 2})"${yAxisText.metadata}>${yAxisText.fitted}</text>
    <text x="${zAxisTitleX}" y="${zEndY - 5}" text-anchor="start"${zAxisText.metadata}>${zAxisText.fitted}</text>
  </g>`;
};
