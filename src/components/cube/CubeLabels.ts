import { fitCubeText, type CubeTextMeasureOptions } from "../../engine/cubeGeometry";
export const escapeSvgText = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

export const shortenLabel = (label: string, maximum = 16): string =>
  label.length > maximum ? `${label.slice(0, maximum - 1)}…` : label;

export const fittedSvgText = (text: string, maxWidth: number, options: CubeTextMeasureOptions): string =>
  escapeSvgText(fitCubeText(text, maxWidth, options));
