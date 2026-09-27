/** A rendered SVG element or standalone SVG markup. */
export type SvgSource = SVGSVGElement | string;

const SVG_MIME_TYPE = "image/svg+xml;charset=utf-8";

const withSvgNamespace = (markup: string): string => {
  if (!/^\s*<svg\b/i.test(markup)) {
    throw new Error("The supplied source is not an SVG document.");
  }

  return /<svg\b[^>]*\sxmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(markup)
    ? markup
    : markup.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
};

/**
 * Produces self-contained SVG markup from the live renderer or already-created
 * markup. The CubeRenderer includes its white background, labels, and axes, so
 * this is deliberately an export of the complete diagram rather than an inner
 * cube group.
 */
export const svgMarkupFromSource = (source: SvgSource): string => {
  const markup = typeof source === "string" ? source : source.outerHTML;
  return withSvgNamespace(markup.trim());
};

export const svgToBlob = (source: SvgSource): Blob =>
  new Blob([svgMarkupFromSource(source)], { type: SVG_MIME_TYPE });

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

/** A PptxGenJS-friendly, UTF-8-safe SVG data URI. */
export const svgToDataUri = (source: SvgSource): string => {
  const bytes = new TextEncoder().encode(svgMarkupFromSource(source));
  return `data:image/svg+xml;base64,${bytesToBase64(bytes)}`;
};

const filenameWithExtension = (filename: string, extension: string): string => {
  const trimmed = filename.trim() || "olap-cube";
  return trimmed.toLowerCase().endsWith(extension) ? trimmed : `${trimmed}${extension}`;
};

/** Trigger a browser download without requiring a server. */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const anchor = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};

/** Download a full, independently viewable SVG cube diagram. */
export const downloadSvg = (svgElement: SVGSVGElement, filename = "olap-cube.svg"): void => {
  downloadBlob(svgToBlob(svgElement), filenameWithExtension(filename, ".svg"));
};
