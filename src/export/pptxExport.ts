import PptxGenJS from "pptxgenjs";
import { createCubeSvgMarkup } from "../components/cube/CubeSvg";
import { createCubeView } from "../engine/cubeEngine";
import { resolveRollupSourceLevel } from "../engine/hierarchy";
import type { CubeDataset, CubeViewModel } from "../models/cube";
import type {
  AxisMapping,
  OperationConfig,
  OperationSettings,
  OperationType,
} from "../models/operation";
import {
  normalizeCubeAppearance,
  type CubeAppearance,
} from "../theme/cubeAppearance";
import { blobToDataUri, svgToPng } from "./pngExport";
import { svgToDataUri } from "./svgExport";

export interface PresentationInput {
  dataset: CubeDataset;
  axisMapping: AxisMapping;
  activeLevels: Record<string, string>;
  operations: OperationSettings;
  appearance?: CubeAppearance;
}

export type PresentationSlideKind = "title" | OperationType;

/** A serialisable slide model shared by the web preview and PPTX exporter. */
export interface PresentationSlideModel {
  number: number;
  kind: PresentationSlideKind;
  title: string;
  subtitle?: string;
  view: CubeViewModel | null;
  details: string[];
  description?: string;
  errors: string[];
}

export interface ExportPresentationOptions extends PresentationInput {
  /** Used as the downloaded .pptx name. Defaults to the dataset title. */
  filename?: string;
  /** SVG stays the default; PNG provides a compatibility fallback when needed. */
  imageFormat?: "svg" | "png";
}

const operationTitles: Record<OperationType, string> = {
  original: "Original Data Cube",
  slice: "Slice Operation",
  dice: "Dice Operation",
  rollup: "Roll-up Operation",
  drilldown: "Drill-down Operation",
};

const getDimension = (dataset: CubeDataset, dimensionId: string) =>
  dataset.dimensions.find((dimension) => dimension.id === dimensionId);

const getLevelName = (dataset: CubeDataset, dimensionId: string, levelId: string | undefined): string => {
  const level = getDimension(dataset, dimensionId)?.levels.find((candidate) => candidate.id === levelId);
  return level?.name ?? "Current level";
};

const getMemberLabel = (dataset: CubeDataset, dimensionId: string, memberId: string): string => {
  const member = getDimension(dataset, dimensionId)?.levels
    .flatMap((level) => level.members)
    .find((candidate) => candidate.id === memberId);
  return member?.label ?? memberId;
};

const currentLevelName = (
  dataset: CubeDataset,
  activeLevels: Record<string, string>,
  dimensionId: string,
): string => {
  const dimension = getDimension(dataset, dimensionId);
  const requested = activeLevels[dimensionId];
  const fallback = [...(dimension?.levels ?? [])].sort((left, right) => left.order - right.order).at(-1)?.id;
  return getLevelName(dataset, dimensionId, requested ?? fallback);
};

const axisDetails = (view: CubeViewModel): string[] => [
  `${view.x.dimensionName}: ${view.x.levelName}`,
  `${view.y.dimensionName}: ${view.y.levelName}`,
  `${view.z.dimensionName}: ${view.z.levelName}`,
  `Measure: ${view.measure.name} (SUM)`,
];

const operationDetails = (
  input: PresentationInput,
  operation: OperationConfig,
  view: CubeViewModel | null,
): string[] => {
  if (operation.type === "original") return view ? axisDetails(view) : [];

  if (operation.type === "slice") {
    const dimensionName = getDimension(input.dataset, operation.dimensionId)?.name ?? "Selected dimension";
    return [`${dimensionName} = ${getMemberLabel(input.dataset, operation.dimensionId, operation.memberId)}`];
  }

  if (operation.type === "dice") {
    return input.dataset.dimensions.map((candidate) => {
      const labels = (operation.selections[candidate.id] ?? [])
        .map((memberId) => getMemberLabel(input.dataset, candidate.id, memberId));
      return `${candidate.name}: ${labels.length > 0 ? labels.join(", ") : "No members selected"}`;
    });
  }

  const dimension = getDimension(input.dataset, operation.dimensionId);
  const dimensionName = dimension?.name ?? "Selected dimension";
  const fromLevel = operation.type === "rollup" && dimension
    ? resolveRollupSourceLevel(
      dimension,
      input.activeLevels[operation.dimensionId],
      operation.sourceLevelId,
    )?.name ?? "Current level"
    : currentLevelName(input.dataset, input.activeLevels, operation.dimensionId);
  const toLevel = getLevelName(input.dataset, operation.dimensionId, operation.targetLevelId);
  return [`${dimensionName}: ${fromLevel} → ${toLevel}`, `Measure: ${input.dataset.measures[0]?.name ?? "Measure"} (SUM)`];
};

const configuredOperations = (settings: OperationSettings): OperationConfig[] => [
  { type: "original" },
  { type: "slice", ...settings.slice },
  { type: "dice", ...settings.dice },
  { type: "rollup", ...settings.rollup },
  { type: "drilldown", ...settings.drilldown },
];

/**
 * Derive the six presentation slides from the same immutable cube engine used
 * by the editor. No values or cube geometry are recalculated in this layer.
 */
export const buildPresentationSlides = (input: PresentationInput): PresentationSlideModel[] => {
  const titleSlide: PresentationSlideModel = {
    number: 1,
    kind: "title",
    title: "OLAP Analysis",
    subtitle: input.dataset.title || "OLAP Cube Presentation",
    view: null,
    details: ["Generated using OLAP Cube Presentation Generator"],
    errors: [],
  };

  const operationSlides = configuredOperations(input.operations).map((operation, index) => {
    const result = createCubeView(input.dataset, {
      axisMapping: input.axisMapping,
      activeLevels: input.activeLevels,
      operation,
    });
    const view = result.view;

    return {
      number: index + 2,
      kind: operation.type,
      title: operationTitles[operation.type],
      view,
      details: operationDetails(input, operation, view),
      description: view?.description,
      errors: result.errors,
    } satisfies PresentationSlideModel;
  });

  return [titleSlide, ...operationSlides];
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
    fontFace: "Aptos",
    fontSize: 7,
    color: "6C7A86",
    margin: 0,
  });
  slide.addText(`${number} / ${total}`, {
    x: 12.15,
    y: 7.12,
    w: 0.62,
    h: 0.18,
    fontFace: "Aptos",
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
    fontFace: "Aptos Display",
    fontSize: 35,
    bold: true,
    color: "123047",
    margin: 0,
  });
  slide.addText(slideModel.subtitle ?? "", {
    x: 0.98,
    y: 3.14,
    w: 10.9,
    h: 0.34,
    fontFace: "Aptos",
    fontSize: 18,
    color: "496576",
    margin: 0,
  });
  slide.addText("Generated using OLAP Cube Presentation Generator", {
    x: 0.98,
    y: 4.4,
    w: 7.5,
    h: 0.24,
    fontFace: "Aptos",
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
    fontFace: "Aptos Display",
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
      fontFace: "Aptos",
      fontSize: 16,
      color: "8A3030",
      breakLine: false,
      margin: 0,
    });
  }

  slide.addText(slideBodyText(slideModel), {
    x: 8.9,
    y: 1.45,
    w: 3.78,
    h: 4.95,
    fontFace: "Aptos",
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
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "OLAP Cube Presentation Generator";
  pptx.company = "OLAP Cube Presentation Generator";
  pptx.subject = options.dataset.title;
  pptx.title = `OLAP Analysis - ${options.dataset.title}`;
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
  };

  const appearance = normalizeCubeAppearance(options.appearance);
  addTitleSlide(pptx, slides[0], slides.length);
  for (const slideModel of slides.slice(1)) {
    await addCubeSlide(pptx, slideModel, slides.length, options.imageFormat ?? "svg", appearance);
  }

  await pptx.writeFile({ fileName: safePptxFilename(options.dataset.title, options.filename) });
  return slides;
};
