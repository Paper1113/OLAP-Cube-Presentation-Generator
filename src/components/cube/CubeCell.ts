import type { CubeCellView } from "../../models/cube";
import type { CubeCellGeometry, CubeGeometryOptions } from "../../engine/cubeGeometry";
import type { ResolvedCubeTheme } from "../../theme/cubeAppearance";

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
  theme: ResolvedCubeTheme,
  includeValue = true,
): string => {
  const { frontX, frontY } = geometry;
  const { cellWidth, cellHeight, depthX, depthY } = options;
  const isEmpty = !cell.hasData;
  const frontFill = isEmpty ? theme.emptyFrontFill : theme.frontFill;
  const topFill = isEmpty ? theme.emptyTopFill : theme.topFill;
  const rightFill = isEmpty ? theme.emptyRightFill : theme.rightFill;
  const label = isEmpty ? "—" : formatValue(cell.value);
  const cellTitle = isEmpty ? "No fact data" : `${measureName}: ${label}`;
  const sideDash = theme.sideStrokeDasharray ? ` stroke-dasharray="${theme.sideStrokeDasharray}"` : "";
  const lineCap = theme.strokeLinecap ? ` stroke-linecap="${theme.strokeLinecap}"` : "";
  const lineJoin = theme.strokeLinejoin ? ` stroke-linejoin="${theme.strokeLinejoin}"` : "";
  const valueMarkup = includeValue ? cubeCellValueMarkup(cell, geometry, options, theme) : "";

  return `<g class="cube-cell"><title>${escapeXml(cellTitle)}</title>
    <polygon points="${frontX},${frontY} ${frontX + depthX},${frontY - depthY} ${frontX + cellWidth + depthX},${frontY - depthY} ${frontX + cellWidth},${frontY}" fill="${topFill}" stroke="${theme.stroke}" stroke-width="${theme.strokeWidth}"${sideDash}${lineCap}${lineJoin} />
    <polygon points="${frontX + cellWidth},${frontY} ${frontX + cellWidth + depthX},${frontY - depthY} ${frontX + cellWidth + depthX},${frontY + cellHeight - depthY} ${frontX + cellWidth},${frontY + cellHeight}" fill="${rightFill}" stroke="${theme.stroke}" stroke-width="${theme.strokeWidth}"${sideDash}${lineCap}${lineJoin} />
    <rect x="${frontX}" y="${frontY}" width="${cellWidth}" height="${cellHeight}" fill="${frontFill}" stroke="${theme.stroke}" stroke-width="${theme.strokeWidth}"${lineCap}${lineJoin} />
    ${valueMarkup}
  </g>`;
};

export const cubeCellValueMarkup = (
  cell: CubeCellView,
  geometry: CubeCellGeometry,
  options: CubeGeometryOptions,
  theme: ResolvedCubeTheme,
): string => {
  const label = cell.hasData ? formatValue(cell.value) : "—";
  const strokeWidth = Math.max(2, options.fontSize * 0.22);
  const frontFill = cell.hasData ? theme.frontFill : theme.emptyFrontFill;
  return `<text data-cube-value="true" data-depth-index="${geometry.zIndex}" x="${geometry.frontX + options.cellWidth / 2}" y="${geometry.frontY + options.cellHeight / 2 + options.fontSize * 0.35}" text-anchor="middle" font-family="${escapeXml(theme.fontFamily)}" font-size="${geometry.zIndex > 0 ? options.fontSize * 0.9 : options.fontSize}" font-weight="${theme.valueFontWeight}" fill="${cell.hasData ? theme.valueFill : theme.emptyValueFill}" stroke="${frontFill}" stroke-width="${strokeWidth}" paint-order="stroke fill" stroke-linejoin="round">${escapeXml(label)}</text>`;
};
