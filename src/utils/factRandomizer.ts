import type { CubeDataset, FactRecord } from "../models/cube";
import type { Dimension, DimensionMember } from "../models/dimension";

export const RANDOM_SALES_MIN = 100;
export const RANDOM_SALES_MAX = 5_000;

const boundedRoll = (random: () => number): number => Math.min(0.999_999_999, Math.max(0, random()));

/** Facts are usually entered at the lowest populated level, so random picks prefer it too. */
export const lowestLevelMembers = (dimension: Dimension): DimensionMember[] =>
  [...dimension.levels]
    .sort((left, right) => right.order - left.order)
    .find((level) => level.members.length > 0)?.members ?? [];

export const randomMemberId = (
  dimension: Dimension,
  currentMemberId?: string,
  random: () => number = Math.random,
): string | undefined => {
  const members = lowestLevelMembers(dimension);
  if (members.length === 0) return undefined;

  const candidates = members.length > 1
    ? members.filter((member) => member.id !== currentMemberId)
    : members;
  return candidates[Math.floor(boundedRoll(random) * candidates.length)]?.id;
};

export const randomSalesValue = (
  random: () => number = Math.random,
  minimum = RANDOM_SALES_MIN,
  maximum = RANDOM_SALES_MAX,
): number => {
  const lower = Math.ceil(Math.min(minimum, maximum));
  const upper = Math.floor(Math.max(minimum, maximum));
  return lower + Math.floor(boundedRoll(random) * (upper - lower + 1));
};

/** New manual rows deliberately omit the measure value instead of silently using zero. */
export const createBlankFact = (dataset: CubeDataset): FactRecord => ({
  coordinates: Object.fromEntries(dataset.dimensions.map((dimension) => [
    dimension.id,
    lowestLevelMembers(dimension)[0]?.id ?? "",
  ])),
  measures: {},
});
