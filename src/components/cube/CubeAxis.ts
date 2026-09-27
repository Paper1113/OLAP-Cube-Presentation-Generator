import type { CubeAxisView } from "../../models/cube";
import type { CubeGeometry } from "../../engine/cubeGeometry";
import { escapeSvgText, shortenLabel } from "./CubeLabels";

export const cubeAxesMarkup = (view: { x: CubeAxisView; y: CubeAxisView; z: CubeAxisView }, geometry: CubeGeometry): string => {
  const { options, originX, originY } = geometry;
  const xStep = options.cellWidth + options.spacing;
  const yStep = options.cellHeight + options.spacing;
  const xBottom = originY + view.y.members.length * yStep + 10;
  const xEnd = originX + view.x.members.length * xStep + 15;
  const yStart = originY + view.y.members.length * yStep;
  const zEndX = originX + Math.max(1, view.z.members.length) * options.depthX + 13;
  const zEndY = originY - Math.max(1, view.z.members.length) * options.depthY - 13;

  const xLabels = view.x.members.map((member, index) =>
    `<text x="${originX + index * xStep + options.cellWidth / 2}" y="${xBottom + 27}" text-anchor="middle" class="member-label">${escapeSvgText(shortenLabel(member.label))}</text>`,
  ).join("");
  const yLabels = view.y.members.map((member, index) =>
    `<text x="${originX - 14}" y="${originY + index * yStep + options.cellHeight / 2 + 4}" text-anchor="end" class="member-label">${escapeSvgText(shortenLabel(member.label))}</text>`,
  ).join("");
  const zLabels = view.z.members.map((member, index) =>
    `<text x="${originX + index * options.depthX + 3}" y="${originY - index * options.depthY - 12}" text-anchor="start" class="member-label">${escapeSvgText(shortenLabel(member.label))}</text>`,
  ).join("");

  return `<g class="cube-axes" fill="none" stroke="#396176" stroke-width="1.5" marker-end="url(#axis-arrow)">
    <line x1="${originX}" y1="${xBottom}" x2="${xEnd}" y2="${xBottom}" />
    <line x1="${originX - 20}" y1="${yStart}" x2="${originX - 20}" y2="${originY - 12}" />
    <line x1="${originX}" y1="${originY}" x2="${zEndX}" y2="${zEndY}" />
  </g>
  <g font-family="Aptos, Arial, sans-serif" font-size="12" fill="#183c52">${xLabels}${yLabels}${zLabels}</g>
  <g font-family="Aptos, Arial, sans-serif" font-size="14" font-weight="700" fill="#0d2f44">
    <text x="${(originX + xEnd) / 2}" y="${xBottom + 54}" text-anchor="middle">${escapeSvgText(`${view.x.dimensionName} · ${view.x.levelName}`)} →</text>
    <text x="${originX - 63}" y="${(originY + yStart) / 2}" text-anchor="middle" transform="rotate(-90 ${originX - 63} ${(originY + yStart) / 2})">${escapeSvgText(`${view.y.dimensionName} · ${view.y.levelName}`)} ↑</text>
    <text x="${zEndX + 8}" y="${zEndY - 5}" text-anchor="start">${escapeSvgText(`${view.z.dimensionName} · ${view.z.levelName}`)} ↗</text>
  </g>`;
};
