import type { CubeDataset } from "../models/cube";
import type { OperationConfig } from "../models/operation";
import { getDimension, getLevel, getMember } from "./hierarchy";

const readableList = (labels: string[]): string => {
  if (labels.length === 0) return "no members";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
};

export const describeOperation = (
  dataset: CubeDataset,
  operation: OperationConfig,
  levelByDimension: Record<string, string>,
): string => {
  const dimensionNames = dataset.dimensions.map((dimension) => dimension.name);

  if (operation.type === "original") {
    return `This cube shows ${dataset.measures[0]?.name ?? "the selected measure"} across ${readableList(dimensionNames)}.`;
  }

  if (operation.type === "slice") {
    const dimension = getDimension(dataset, operation.dimensionId);
    const member = dimension ? getMember(dimension, operation.memberId) : undefined;
    const retained = dataset.dimensions
      .filter((candidate) => candidate.id !== operation.dimensionId)
      .map((candidate) => candidate.name);
    return `The Slice operation selects ${member?.label ?? "the selected member"} from the ${dimension?.name ?? "selected"} dimension while retaining ${readableList(retained)}.`;
  }

  if (operation.type === "dice") {
    const selections = dataset.dimensions.flatMap((dimension) => {
      const labels = (operation.selections[dimension.id] ?? [])
        .map((memberId) => getMember(dimension, memberId)?.label)
        .filter((label): label is string => Boolean(label));
      return labels.length ? [`${dimension.name}: ${readableList(labels)}`] : [];
    });
    return `The Dice operation creates a sub-cube containing ${readableList(selections)}.`;
  }

  const dimension = getDimension(dataset, operation.dimensionId);
  const sourceLevel = dimension
    ? getLevel(dimension, operation.type === "rollup"
      ? operation.sourceLevelId ?? levelByDimension[operation.dimensionId]
      : levelByDimension[operation.dimensionId])
    : undefined;
  const targetLevel = dimension ? getLevel(dimension, operation.targetLevelId) : undefined;
  const action = operation.type === "rollup" ? "aggregates" : "expands";
  const operationName = operation.type === "rollup" ? "Roll-up" : "Drill-down";
  return `The ${operationName} operation ${action} the ${dimension?.name ?? "selected"} dimension from ${sourceLevel?.name ?? "the current level"} level to ${targetLevel?.name ?? "the target level"} level.`;
};
