import type { CubeCellView } from "../../models/cube";
import type { CubeCellGeometry, CubeGeometryOptions } from "../../engine/cubeGeometry";
import type { ResolvedCubeTheme } from "../../theme/cubeAppearance";
import { measureCubeTextWidth } from "../../engine/cubeGeometry";

const escapeXml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const decimalFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const preciseFormatter = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 });
/** Two decimals for ordinary values; four significant digits below .01;
 * four significant digits in scientific notation below 1e-4 or at/above 1e9.
 * Full round-trip JS values remain in titles and the data table. */
export const formatCubeCellValue = (value: number): string => {
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude < 1e-4 || magnitude >= 999_999_999.995)
    return value.toExponential(3).replace(/\.?0+e/, "e");
  return magnitude < .01 ? preciseFormatter.format(value) : decimalFormatter.format(value);
};

export const cubeCellFittedValue = (cell: CubeCellView, geometry: CubeCellGeometry,
  options: CubeGeometryOptions, theme: ResolvedCubeTheme): {label: string; fontSize: number} => {
  let label = cubeCellValueLabel(cell);
  let fontSize = cubeCellValueFontSize(geometry, options);
  const width = () => measureCubeTextWidth(label, {fontFamily: theme.fontFamily, fontSize, fontWeight: theme.valueFontWeight});
  if (width() > options.cellWidth - 10 && cell.hasData && cell.value !== 0)
    label = cell.value.toExponential(3).replace(/\.?0+e/, "e");
  fontSize *= Math.min(1, (options.cellWidth - 10) / width());
  return {label, fontSize};
};

export const cubeCellValueLabel = (cell: CubeCellView): string =>
  cell.hasData ? formatCubeCellValue(cell.value) : "—";

export const cubeCellValueFontSize = (
  geometry: CubeCellGeometry,
  options: CubeGeometryOptions,
): number => geometry.zIndex > 0 ? options.fontSize * 0.9 : options.fontSize;

export const cubeCellValuePosition = (
  geometry: CubeCellGeometry,
  options: CubeGeometryOptions,
): { x: number; y: number } => ({
  x: geometry.frontX + options.cellWidth / 2,
  y: geometry.frontY + options.cellHeight / 2 + options.fontSize * 0.35,
});

export const cubeCellValueStrokeWidth = (options: CubeGeometryOptions): number =>
  Math.max(2, options.fontSize * 0.22);

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
  const label = cubeCellValueLabel(cell);
  const cellTitle = `${cell.xMemberId} × ${cell.yMemberId} × ${cell.zMemberId} · ${isEmpty ? "No fact data" : `${measureName}: ${String(cell.value)}`} (display: ${label})`;
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
  const {label, fontSize} = cubeCellFittedValue(cell, geometry, options, theme);
  const strokeWidth = cubeCellValueStrokeWidth(options);
  const position = cubeCellValuePosition(geometry, options);
  const frontFill = cell.hasData ? theme.frontFill : theme.emptyFrontFill;
  return `<text data-cube-value="true" data-depth-index="${geometry.zIndex}" x="${position.x}" y="${position.y}" text-anchor="middle" font-family="${escapeXml(theme.fontFamily)}" font-size="${fontSize}" font-weight="${theme.valueFontWeight}" fill="${cell.hasData ? theme.valueFill : theme.emptyValueFill}" stroke="${frontFill}" stroke-width="${strokeWidth}" paint-order="stroke fill" stroke-linejoin="round">${label}</text>`;
};
