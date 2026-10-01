import { measureCubeTextWidth } from "../../engine/cubeGeometry";
import { fittedSvgText } from "./CubeLabels";
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
): string => {
  const { frontX, frontY } = geometry;
  const { cellWidth, cellHeight, depthX, depthY, fontSize } = options;
  const isEmpty = !cell.hasData;
  const frontFill = isEmpty ? theme.emptyFrontFill : theme.frontFill;
  const topFill = isEmpty ? theme.emptyTopFill : theme.topFill;
  const rightFill = isEmpty ? theme.emptyRightFill : theme.rightFill;
  const fullLabel = isEmpty ? "—" : formatValue(cell.value);
  const label = measureCubeTextWidth(fullLabel, { fontFamily: theme.fontFamily, fontSize, fontWeight: theme.valueFontWeight }) > cellWidth - 10 && !isEmpty
    ? cell.value.toExponential(2) : fullLabel;
  const cellTitle = isEmpty ? "No fact data" : `${measureName}: ${fullLabel}`;
  const sideDash = theme.sideStrokeDasharray ? ` stroke-dasharray="${theme.sideStrokeDasharray}"` : "";
  const lineCap = theme.strokeLinecap ? ` stroke-linecap="${theme.strokeLinecap}"` : "";
  const lineJoin = theme.strokeLinejoin ? ` stroke-linejoin="${theme.strokeLinejoin}"` : "";

  return `<g class="cube-cell"><title>${escapeXml(cellTitle)}</title>
    <polygon points="${frontX},${frontY} ${frontX + depthX},${frontY - depthY} ${frontX + cellWidth + depthX},${frontY - depthY} ${frontX + cellWidth},${frontY}" fill="${topFill}" stroke="${theme.stroke}" stroke-width="${theme.strokeWidth}"${sideDash}${lineCap}${lineJoin} />
    <polygon points="${frontX + cellWidth},${frontY} ${frontX + cellWidth + depthX},${frontY - depthY} ${frontX + cellWidth + depthX},${frontY + cellHeight - depthY} ${frontX + cellWidth},${frontY + cellHeight}" fill="${rightFill}" stroke="${theme.stroke}" stroke-width="${theme.strokeWidth}"${sideDash}${lineCap}${lineJoin} />
    <rect x="${frontX}" y="${frontY}" width="${cellWidth}" height="${cellHeight}" fill="${frontFill}" stroke="${theme.stroke}" stroke-width="${theme.strokeWidth}"${lineCap}${lineJoin} />
    <text x="${frontX + cellWidth / 2}" y="${frontY + cellHeight / 2 + fontSize * 0.35}" text-anchor="middle" font-family="${escapeXml(theme.fontFamily)}" font-size="${fontSize}" font-weight="${theme.valueFontWeight}" fill="${isEmpty ? theme.emptyValueFill : theme.valueFill}">${fittedSvgText(label, cellWidth - 10, { fontFamily: theme.fontFamily, fontSize, fontWeight: theme.valueFontWeight })}</text>
  </g>`;
};
