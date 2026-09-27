import type { CubeDataset } from "../models/cube";
import type { Dimension, DimensionLevel, DimensionMember } from "../models/dimension";

export const orderedLevels = (dimension: Dimension): DimensionLevel[] =>
  [...dimension.levels].sort((left, right) => left.order - right.order);

export const getDimension = (dataset: CubeDataset, dimensionId: string): Dimension | undefined =>
  dataset.dimensions.find((dimension) => dimension.id === dimensionId);

export const getLevel = (dimension: Dimension, levelId: string): DimensionLevel | undefined =>
  dimension.levels.find((level) => level.id === levelId);

export const getMember = (dimension: Dimension, memberId: string): DimensionMember | undefined =>
  dimension.levels.flatMap((level) => level.members).find((member) => member.id === memberId);

export const memberAtLevel = (
  dimension: Dimension,
  memberId: string,
  targetLevelId: string,
): DimensionMember | undefined => {
  let current = getMember(dimension, memberId);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    if (current.levelId === targetLevelId) {
      return current;
    }
    visited.add(current.id);
    current = current.parentMemberId ? getMember(dimension, current.parentMemberId) : undefined;
  }

  return undefined;
};

export const membersAtLevel = (dimension: Dimension, levelId: string): DimensionMember[] =>
  getLevel(dimension, levelId)?.members ?? [];

export const levelIndex = (dimension: Dimension, levelId: string): number =>
  orderedLevels(dimension).findIndex((level) => level.id === levelId);

export const levelName = (dimension: Dimension, levelId: string): string =>
  getLevel(dimension, levelId)?.name ?? "Unknown level";

export const hasFactDataAtLevel = (
  dataset: CubeDataset,
  dimensionId: string,
  levelId: string,
): boolean => {
  const dimension = getDimension(dataset, dimensionId);
  if (!dimension) {
    return false;
  }

  return dataset.facts.some((fact) => {
    const coordinate = fact.coordinates[dimensionId];
    return coordinate !== undefined && memberAtLevel(dimension, coordinate, levelId) !== undefined;
  });
};

export const isMemberAtLevel = (
  dimension: Dimension,
  memberId: string,
  levelId: string,
): boolean => getMember(dimension, memberId)?.levelId === levelId;
