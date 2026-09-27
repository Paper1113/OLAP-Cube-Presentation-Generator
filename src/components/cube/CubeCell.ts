import type { CubeCellView } from "../../models/cube";
import type { CubeCellGeometry, CubeGeometryOptions } from "../../engine/cubeGeometry";

const escapeXml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const formatValue = (value: number): string => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
}).format(value);

export const cubeCellMarkup = (
  cell: CubeCellView,
  geometry: CubeCellGeometry,
  options: CubeGeometryOptions,
  measureName: string,
): string => {
  const { frontX, frontY } = geometry;
  const { cellWidth, cellHeight, depthX, depthY, fontSize } = options;
  const isEmpty = !cell.hasData;
  const frontFill = isEmpty ? "#f4f7f9" : "#d9eaf5";
  const topFill = isEmpty ? "#fafcfd" : "#edf6fb";
  const rightFill = isEmpty ? "#e8eef2" : "#b8d4e7";
  const label = isEmpty ? "—" : formatValue(cell.value);
  const cellTitle = isEmpty ? "No fact data" : `${measureName}: ${label}`;
  return `<g class="cube-cell"><title>${escapeXml(cellTitle)}</title>
    <polygon points="${frontX},${frontY} ${frontX + depthX},${frontY - depthY} ${frontX + cellWidth + depthX},${frontY - depthY} ${frontX + cellWidth},${frontY}" fill="${topFill}" stroke="#24485e" stroke-width="1.2" />
    <polygon points="${frontX + cellWidth},${frontY} ${frontX + cellWidth + depthX},${frontY - depthY} ${frontX + cellWidth + depthX},${frontY + cellHeight - depthY} ${frontX + cellWidth},${frontY + cellHeight}" fill="${rightFill}" stroke="#24485e" stroke-width="1.2" />
    <rect x="${frontX}" y="${frontY}" width="${cellWidth}" height="${cellHeight}" fill="${frontFill}" stroke="#24485e" stroke-width="1.2" />
    <text x="${frontX + cellWidth / 2}" y="${frontY + cellHeight / 2 + fontSize * 0.35}" text-anchor="middle" font-family="Aptos, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#102d40">${escapeXml(label)}</text>
  </g>`;
};
