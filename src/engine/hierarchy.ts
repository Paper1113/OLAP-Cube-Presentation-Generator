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

/**
 * Derive the source level for the generated Roll-up control. A visible level
 * with a higher ancestor rolls up from itself; a visible top level falls back
 * to the leaf level so the default Product and Location views remain
 * Drill-down-ready while still exposing a valid aggregation.
 */
export const rollupSourceLevel = (
  dimension: Dimension,
  activeLevelId: string | undefined,
): DimensionLevel | undefined => {
  const levels = orderedLevels(dimension);
  const visibleLevel = activeLevelId ? getLevel(dimension, activeLevelId) : levels.at(-1);
  if (!visibleLevel) return undefined;

  const visibleIndex = levels.findIndex((level) => level.id === visibleLevel.id);
  if (visibleIndex > 0) return visibleLevel;

  const leafLevel = levels.at(-1);
  return leafLevel && leafLevel.id !== visibleLevel.id ? leafLevel : undefined;
};

/**
 * Keep persisted Roll-up settings aligned with the current visible hierarchy.
 * Older or stale workspaces may retain a source from a previous active level.
 */
export const resolveRollupSourceLevel = (
  dimension: Dimension,
  activeLevelId: string | undefined,
  configuredSourceLevelId: string | undefined,
): DimensionLevel | undefined => {
  const derivedSource = rollupSourceLevel(dimension, activeLevelId);
  const configuredSource = configuredSourceLevelId
    ? getLevel(dimension, configuredSourceLevelId)
    : undefined;
  return configuredSource?.id === derivedSource?.id
    ? configuredSource
    : derivedSource ?? configuredSource;
};

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
