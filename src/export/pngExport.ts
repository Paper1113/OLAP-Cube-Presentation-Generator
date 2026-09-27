import {
  downloadBlob,
  svgMarkupFromSource,
  type SvgSource,
} from "./svgExport";

export interface PngExportOptions {
  /** Export scale relative to the SVG viewBox. 3 gives a presentation-ready PNG. */
  scale?: number;
  /** White by default so exported diagrams retain their presentation background. */
  background?: string;
}

const readSvgDimensions = (markup: string): { width: number; height: number } => {
  const viewBox = markup.match(/\bviewBox\s*=\s*["']\s*[-+\d.]+\s+[-+\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (viewBox) {
    const width = Number(viewBox[1]);
    const height = Number(viewBox[2]);
    if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
      return { width, height };
    }
  }

  const width = Number(markup.match(/\bwidth\s*=\s*["']([\d.]+)/i)?.[1]);
  const height = Number(markup.match(/\bheight\s*=\s*["']([\d.]+)/i)?.[1]);
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1280,
    height: Number.isFinite(height) && height > 0 ? height : 720,
  };
};

const loadImage = (objectUrl: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("The SVG could not be converted to a PNG image."));
  image.src = objectUrl;
});

const canvasBlob = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("The browser could not encode the PNG image."));
  }, "image/png");
});

/**
 * Rasterise SVG only at export time. The application renderer remains SVG;
 * canvas is used solely to produce a high-resolution PNG download or fallback.
 */
export const svgToPng = async (
  source: SvgSource,
  options: PngExportOptions = {},
): Promise<Blob> => {
  const markup = svgMarkupFromSource(source);
  const dimensions = readSvgDimensions(markup);
  const scale = Math.max(1, Math.min(options.scale ?? 3, 6));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(dimensions.width * scale);
  canvas.height = Math.ceil(dimensions.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser does not support PNG export.");

  context.fillStyle = options.background ?? "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const svgBlob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);
  try {
    const image = await loadImage(objectUrl);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await canvasBlob(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const blobToDataUri = async (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") resolve(reader.result);
    else reject(new Error("The image data could not be read."));
  };
  reader.onerror = () => reject(new Error("The image data could not be read."));
  reader.readAsDataURL(blob);
});

const pngFilename = (filename: string): string => {
  const trimmed = filename.trim() || "olap-cube";
  return trimmed.toLowerCase().endsWith(".png") ? trimmed : `${trimmed}.png`;
};

/** Generate and download a high-resolution PNG based on the complete SVG diagram. */
export const downloadPng = async (
  svgElement: SVGSVGElement,
  filename = "olap-cube.png",
  options: PngExportOptions = {},
): Promise<void> => {
  const png = await svgToPng(svgElement, options);
  downloadBlob(png, pngFilename(filename));
};
