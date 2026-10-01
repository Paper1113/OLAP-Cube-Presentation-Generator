import { createCubeView } from "../engine/cubeEngine";
import { rollupSourceLevel } from "../engine/hierarchy";
import type { CubeDataset, CubeViewModel } from "../models/cube";
import type { AxisMapping, OperationConfig, OperationSettings, OperationType } from "../models/operation";
import type { CubeAppearance } from "../theme/cubeAppearance";

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
    ? rollupSourceLevel(dimension, input.activeLevels[operation.dimensionId])?.name ?? "Current level"
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


export const presentationErrors = (slides: PresentationSlideModel[]): string[] => slides
  .filter(slide => slide.kind !== "title" && (!slide.view || slide.errors.length))
  .map(slide => `${slide.title}: ${slide.errors.join(" ")} Fix this operation's selections or hierarchy settings; check Original cube levels and axis mapping in Advanced Settings.`);
