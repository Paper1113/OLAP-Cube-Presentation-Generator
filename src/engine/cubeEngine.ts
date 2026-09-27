import type {
  CubeAxisView,
  CubeCellView,
  CubeDataset,
  CubeViewModel,
  Measure,
} from "../models/cube";
import type { AxisMapping, OperationConfig } from "../models/operation";
import { addToAggregate } from "./aggregation";
import { describeOperation } from "./description";
import {
  getDimension,
  getLevel,
  hasFactDataAtLevel,
  isMemberAtLevel,
  levelIndex,
  memberAtLevel,
  membersAtLevel,
  orderedLevels,
} from "./hierarchy";

export interface CubeRequest {
  axisMapping: AxisMapping;
  activeLevels: Record<string, string>;
  operation: OperationConfig;
}

export interface CubeBuildResult {
  view: CubeViewModel | null;
  errors: string[];
}

const cellKey = (xMemberId: string, yMemberId: string, zMemberId: string): string =>
  `${xMemberId}\u0000${yMemberId}\u0000${zMemberId}`;

const operationLabel: Record<OperationConfig["type"], string> = {
  original: "Original OLAP Cube",
  slice: "Slice Operation",
  dice: "Dice Operation",
  rollup: "Roll-up Operation",
  drilldown: "Drill-down Operation",
};

const validAxisMapping = (dataset: CubeDataset, axisMapping: AxisMapping): string[] => {
  const mapping = [axisMapping.x, axisMapping.y, axisMapping.z];
  const unique = new Set(mapping);
  const errors: string[] = [];
  if (unique.size !== 3) errors.push("Each visual axis must use a different dimension.");
  mapping.forEach((dimensionId) => {
    if (!getDimension(dataset, dimensionId)) {
      errors.push("Axis mapping references a dimension that does not exist.");
    }
  });
  return errors;
};

const currentLevelFor = (
  dataset: CubeDataset,
  dimensionId: string,
  activeLevels: Record<string, string>,
): string | undefined => {
  const dimension = getDimension(dataset, dimensionId);
  if (!dimension) return undefined;
  const requested = activeLevels[dimensionId];
  if (requested && getLevel(dimension, requested)) return requested;
  return orderedLevels(dimension).at(-1)?.id;
};

const asAxis = (dataset: CubeDataset, dimensionId: string, levelId: string): CubeAxisView | null => {
  const dimension = getDimension(dataset, dimensionId);
  const level = dimension ? getLevel(dimension, levelId) : undefined;
  if (!dimension || !level) return null;
  return {
    dimensionId,
    dimensionName: dimension.name,
    levelId,
    levelName: level.name,
    members: level.members.map((member) => ({ id: member.id, label: member.label })),
  };
};

const resolveOperationLevels = (
  dataset: CubeDataset,
  request: CubeRequest,
  levels: Record<string, string>,
): string[] => {
  const errors: string[] = [];
  const operation = request.operation;
  if (operation.type !== "rollup" && operation.type !== "drilldown") return errors;

  const dimension = getDimension(dataset, operation.dimensionId);
  const sourceLevelId = levels[operation.dimensionId];
  const targetLevel = dimension ? getLevel(dimension, operation.targetLevelId) : undefined;
  if (!dimension || !sourceLevelId || !targetLevel) {
    return ["The selected hierarchy transition is no longer available."];
  }

  const sourceIndex = levelIndex(dimension, sourceLevelId);
  const targetIndex = levelIndex(dimension, operation.targetLevelId);
  if (operation.type === "rollup") {
    if (targetIndex < 0 || targetIndex >= sourceIndex) {
      errors.push("Roll-up must move to a higher hierarchy level.");
    } else {
      levels[operation.dimensionId] = operation.targetLevelId;
    }
  } else if (targetIndex < 0 || targetIndex <= sourceIndex) {
    errors.push("Drill-down must move to a lower hierarchy level.");
  } else if (!hasFactDataAtLevel(dataset, operation.dimensionId, operation.targetLevelId)) {
    errors.push("No lower-level data is available for this Drill-down operation.");
  } else {
    levels[operation.dimensionId] = operation.targetLevelId;
  }

  return errors;
};

const selectionsFor = (
  dataset: CubeDataset,
  request: CubeRequest,
  levels: Record<string, string>,
): { selections: Record<string, string[]>; errors: string[] } => {
  const selections: Record<string, string[]> = {};
  const errors: string[] = [];

  dataset.dimensions.forEach((dimension) => {
    selections[dimension.id] = membersAtLevel(dimension, levels[dimension.id]).map((member) => member.id);
  });

  const { operation } = request;
  if (operation.type === "slice") {
    const dimension = getDimension(dataset, operation.dimensionId);
    if (!dimension || !isMemberAtLevel(dimension, operation.memberId, levels[operation.dimensionId])) {
      errors.push("Slice requires one member from the current hierarchy level.");
    } else {
      selections[operation.dimensionId] = [operation.memberId];
    }
  }

  if (operation.type === "dice") {
    dataset.dimensions.forEach((dimension) => {
      const selected = operation.selections[dimension.id];
      if (!selected || selected.length === 0) {
        errors.push(`Dice requires at least one ${dimension.name} member.`);
        return;
      }
      const invalid = selected.some(
        (memberId) => !isMemberAtLevel(dimension, memberId, levels[dimension.id]),
      );
      if (invalid) {
        errors.push(`Dice includes a ${dimension.name} member outside the current level.`);
      } else {
        selections[dimension.id] = selected;
      }
    });
  }

  return { selections, errors };
};

export const createCubeView = (dataset: CubeDataset, request: CubeRequest): CubeBuildResult => {
  const errors = validAxisMapping(dataset, request.axisMapping);
  if (dataset.dimensions.length !== 3) errors.push("The visual cube requires exactly three dimensions.");
  const measure: Measure | undefined = dataset.measures[0];
  if (!measure) errors.push("Add a SUM measure before rendering a cube.");

  const levels: Record<string, string> = {};
  dataset.dimensions.forEach((dimension) => {
    const levelId = currentLevelFor(dataset, dimension.id, request.activeLevels);
    if (!levelId) errors.push(`${dimension.name} needs at least one hierarchy level.`);
    else levels[dimension.id] = levelId;
  });

  if (errors.length > 0 || !measure) return { view: null, errors };

  errors.push(...resolveOperationLevels(dataset, request, levels));
  const { selections, errors: selectionErrors } = selectionsFor(dataset, request, levels);
  errors.push(...selectionErrors);
  if (errors.length > 0) return { view: null, errors };

  const x = asAxis(dataset, request.axisMapping.x, levels[request.axisMapping.x]);
  const y = asAxis(dataset, request.axisMapping.y, levels[request.axisMapping.y]);
  const z = asAxis(dataset, request.axisMapping.z, levels[request.axisMapping.z]);
  if (!x || !y || !z) {
    return { view: null, errors: ["One or more axis levels could not be resolved."] };
  }

  x.members = x.members.filter((member) => selections[x.dimensionId].includes(member.id));
  y.members = y.members.filter((member) => selections[y.dimensionId].includes(member.id));
  z.members = z.members.filter((member) => selections[z.dimensionId].includes(member.id));

  const aggregates = new Map<string, number>();
  dataset.facts.forEach((fact) => {
    const mapped: Record<string, string> = {};
    const dimensions = [x, y, z];
    for (const axis of dimensions) {
      const dimension = getDimension(dataset, axis.dimensionId);
      const coordinate = fact.coordinates[axis.dimensionId];
      const member = dimension && coordinate
        ? memberAtLevel(dimension, coordinate, axis.levelId)
        : undefined;
      if (!member || !selections[axis.dimensionId].includes(member.id)) return;
      mapped[axis.dimensionId] = member.id;
    }
    const value = fact.measures[measure.id];
    if (typeof value === "number" && Number.isFinite(value)) {
      addToAggregate(aggregates, cellKey(mapped[x.dimensionId], mapped[y.dimensionId], mapped[z.dimensionId]), value);
    }
  });

  const cells: CubeCellView[] = [];
  x.members.forEach((xMember) => {
    y.members.forEach((yMember) => {
      z.members.forEach((zMember) => {
        const value = aggregates.get(cellKey(xMember.id, yMember.id, zMember.id));
        cells.push({
          xMemberId: xMember.id,
          yMemberId: yMember.id,
          zMemberId: zMember.id,
          value: value ?? 0,
          hasData: value !== undefined,
        });
      });
    });
  });

  return {
    view: {
      datasetTitle: dataset.title,
      measure,
      x,
      y,
      z,
      cells,
      operationLabel: operationLabel[request.operation.type],
      description: describeOperation(dataset, request.operation, request.activeLevels),
    },
    errors: [],
  };
};

export const canDrillDown = (
  dataset: CubeDataset,
  activeLevels: Record<string, string>,
  dimensionId: string,
  targetLevelId: string,
): boolean => {
  const dimension = getDimension(dataset, dimensionId);
  const sourceLevelId = activeLevels[dimensionId];
  if (!dimension || !sourceLevelId) return false;
  return levelIndex(dimension, targetLevelId) > levelIndex(dimension, sourceLevelId)
    && hasFactDataAtLevel(dataset, dimensionId, targetLevelId);
};
