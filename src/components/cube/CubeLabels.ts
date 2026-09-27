export const escapeSvgText = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

export const shortenLabel = (label: string, maximum = 16): string =>
  label.length > maximum ? `${label.slice(0, maximum - 1)}…` : label;
