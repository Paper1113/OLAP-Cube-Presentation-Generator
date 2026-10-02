import { layoutDatasetTitle } from "./titleLayout";
import PptxGenJS from "pptxgenjs";
import { createCubeSvgMarkup } from "../components/cube/CubeSvg";
import { normalizeCubeAppearance, type CubeAppearance } from "../theme/cubeAppearance";
import { blobToDataUri, svgToPng } from "./pngExport";
import { svgToDataUri } from "./svgExport";
import { buildPresentationSlides, presentationErrors, type PresentationInput, type PresentationSlideModel } from "./presentationModel";
export { buildPresentationSlides } from "./presentationModel";

export interface ExportPresentationOptions extends PresentationInput {
  /** Used as the downloaded .pptx name. Defaults to the dataset title. */
  filename?: string;
  /** SVG stays the default; PNG provides a compatibility fallback when needed. */
  imageFormat?: "svg" | "png";
}

/** Conservative Unicode capacity: ellipsis is explicit, complete text is in speaker notes. */
const fitSlideText = (text: string, capacity: number): string => {
  const chars = Array.from(text);
  return chars.length <= capacity ? text : `${chars.slice(0, capacity - 1).join("")}…`;
};

const safePptxFilename = (datasetTitle: string, requestedFilename?: string): string => {
  const baseName = (requestedFilename || datasetTitle || "olap-cube-presentation")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");
  return baseName.toLowerCase().endsWith(".pptx") ? baseName : `${baseName}.pptx`;
};

const diagramBox = (svgMarkup: string): { x: number; y: number; w: number; h: number } => {
  const match = svgMarkup.match(/\bviewBox\s*=\s*["']\s*[-+\d.]+\s+[-+\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  const sourceWidth = Number(match?.[1]) || 16;
  const sourceHeight = Number(match?.[2]) || 9;
  const maximum = { x: 0.45, y: 1.18, w: 8.15, h: 5.65 };
  const scale = Math.min(maximum.w / sourceWidth, maximum.h / sourceHeight);
  const w = sourceWidth * scale;
  const h = sourceHeight * scale;
  return {
    x: maximum.x + (maximum.w - w) / 2,
    y: maximum.y + (maximum.h - h) / 2,
    w,
    h,
  };
};

const descriptionText = (slide: PresentationSlideModel): string => {
  if (slide.errors.length > 0) return slide.errors.join("\n");
  return slide.description ?? "";
};

const slideBodyText = (slide: PresentationSlideModel): string => {
  const pieces = [...slide.details];
  if (slide.description) pieces.push("", slide.description);
  if (slide.errors.length > 0) pieces.push("", ...slide.errors);
  return pieces.join("\n");
};

const diagramData = async (svgMarkup: string, imageFormat: "svg" | "png"): Promise<string> => {
  if (imageFormat === "png") {
    return blobToDataUri(await svgToPng(svgMarkup, { scale: 3 }));
  }
  return svgToDataUri(svgMarkup);
};

const addPresentationFooter = (
  slide: ReturnType<InstanceType<typeof PptxGenJS>["addSlide"]>,
  number: number,
  total: number,
): void => {
  slide.addText("OLAP Cube Presentation Generator", {
    x: 0.52,
    y: 7.12,
    w: 5.2,
    h: 0.18,
    fontFace: "Arial Unicode MS",
    fontSize: 7,
    color: "6C7A86",
    margin: 0,
  });
  slide.addText(`${number} / ${total}`, {
    x: 12.15,
    y: 7.12,
    w: 0.62,
    h: 0.18,
    fontFace: "Arial Unicode MS",
    fontSize: 7,
    color: "6C7A86",
    align: "right",
    margin: 0,
  });
};

const addTitleSlide = (
  pptx: InstanceType<typeof PptxGenJS>,
  slideModel: PresentationSlideModel,
  totalSlides: number,
): void => {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addText(slideModel.title, {
    x: 0.95,
    y: 2.35,
    w: 11.4,
    h: 0.62,
    fontFace: "Arial Unicode MS",
    fontSize: 35,
    bold: true,
    color: "123047",
    margin: 0,
  });
  slide.addNotes(slideModel.subtitle ?? "");
  // Shared two-line layout; full title remains in notes.
  slide.addText(layoutDatasetTitle(slideModel.subtitle ?? ""), {
    x: 0.98,
    y: 3.14,
    w: 10.9,
    h: 0.85,
    fontFace: "Arial Unicode MS",
    fontSize: 16,
    color: "496576",
    breakLine: false,
    margin: 0,
  });
  slide.addText("Generated using OLAP Cube Presentation Generator", {
    x: 0.98,
    y: 4.4,
    w: 7.5,
    h: 0.24,
    fontFace: "Arial Unicode MS",
    fontSize: 10,
    color: "6C7A86",
    margin: 0,
  });
  addPresentationFooter(slide, slideModel.number, totalSlides);
};

const addCubeSlide = async (
  pptx: InstanceType<typeof PptxGenJS>,
  slideModel: PresentationSlideModel,
  totalSlides: number,
  imageFormat: "svg" | "png",
  appearance: CubeAppearance,
): Promise<void> => {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addText(slideModel.title, {
    x: 0.52,
    y: 0.38,
    w: 8.1,
    h: 0.42,
    fontFace: "Arial Unicode MS",
    fontSize: 24,
    bold: true,
    color: "123047",
    margin: 0,
  });

  if (slideModel.view) {
    const svgMarkup = createCubeSvgMarkup(slideModel.view, { includeTitle: false, appearance });
    slide.addImage({
      data: await diagramData(svgMarkup, imageFormat),
      ...diagramBox(svgMarkup),
    });
  } else {
    slide.addText(`Diagram unavailable\n${descriptionText(slideModel)}`, {
      x: 0.72,
      y: 2.45,
      w: 7.45,
      h: 1.0,
      fontFace: "Arial Unicode MS",
      fontSize: 16,
      color: "8A3030",
      breakLine: false,
      margin: 0,
    });
  }

  slide.addNotes(slideBodyText(slideModel));
  slide.addText(fitSlideText(slideBodyText(slideModel), 580), {
    x: 8.9,
    y: 1.45,
    w: 3.78,
    h: 4.95,
    fit: "shrink",
    fontFace: "Arial Unicode MS",
    fontSize: 13,
    color: "183C52",
    breakLine: false,
    margin: 0.06,
    valign: "top",
  });
  addPresentationFooter(slide, slideModel.number, totalSlides);
};

/**
 * Create and download a six-slide widescreen PowerPoint in the browser.
 * Each diagram is generated from CubeSvg, the same source used by the live UI.
 */
export const exportPresentation = async (
  options: ExportPresentationOptions,
): Promise<PresentationSlideModel[]> => {
  const slides = buildPresentationSlides(options);
  const errors = presentationErrors(slides);
  if (errors.length) throw new Error(`PowerPoint blocked:\n${errors.join("\n")}`);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "OLAP Cube Presentation Generator";
  pptx.company = "OLAP Cube Presentation Generator";
  pptx.subject = options.dataset.title;
  pptx.title = `OLAP Analysis - ${options.dataset.title}`;
  pptx.theme = {
    headFontFace: "Arial Unicode MS",
    bodyFontFace: "Arial Unicode MS",
  };

  const appearance = normalizeCubeAppearance(options.appearance);
  addTitleSlide(pptx, slides[0], slides.length);
  for (const slideModel of slides.slice(1)) {
    await addCubeSlide(pptx, slideModel, slides.length, options.imageFormat ?? "svg", appearance);
  }

  await pptx.writeFile({ fileName: safePptxFilename(options.dataset.title, options.filename) });
  return slides;
};
