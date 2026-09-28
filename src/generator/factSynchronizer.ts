import type { CubeDataset, FactRecord } from "../models/cube";
import { orderedLevels } from "../engine/hierarchy";
import { randomSalesValue } from "../utils/factRandomizer";

const coordinateKey = (coordinates: Record<string, string>, dimensionIds: string[]): string =>
  dimensionIds.map((dimensionId) => coordinates[dimensionId] ?? "").join("\u0000");

const leafMemberIds = (dataset: CubeDataset, dimensionId: string): string[] => {
  const dimension = dataset.dimensions.find((candidate) => candidate.id === dimensionId);
  const leafLevel = dimension
    ? [...orderedLevels(dimension)].reverse().find((level) => level.members.length > 0)
    : undefined;
  return leafLevel?.members.map((member) => member.id) ?? [];
};

const cartesianCoordinates = (
  dimensionIds: string[],
  membersByDimension: Map<string, string[]>,
): Record<string, string>[] => {
  const coordinates: Record<string, string>[] = [];
  const visit = (dimensionIndex: number, current: Record<string, string>) => {
    if (dimensionIndex === dimensionIds.length) {
      coordinates.push(current);
      return;
    }
    const dimensionId = dimensionIds[dimensionIndex];
    (membersByDimension.get(dimensionId) ?? []).forEach((memberId) => {
      visit(dimensionIndex + 1, { ...current, [dimensionId]: memberId });
    });
  };
  visit(0, {});
  return coordinates;
};

/**
 * Rebuilds the leaf-level Cartesian product after an advanced hierarchy edit.
 * Existing facts survive when their coordinates still exist; duplicate or stale
 * coordinate combinations are removed.
 */
export const synchronizeLeafFacts = (
  dataset: CubeDataset,
  random: () => number = Math.random,
): CubeDataset => {
  const dimensionIds = dataset.dimensions.map((dimension) => dimension.id);
  const membersByDimension = new Map(dimensionIds.map((dimensionId) => [
    dimensionId,
    leafMemberIds(dataset, dimensionId),
  ]));
  const leafCoordinates = cartesianCoordinates(dimensionIds, membersByDimension);
  const validKeys = new Set(leafCoordinates.map((coordinates) => coordinateKey(coordinates, dimensionIds)));
  const existingByKey = new Map<string, FactRecord>();

  dataset.facts.forEach((fact) => {
    const key = coordinateKey(fact.coordinates, dimensionIds);
    if (validKeys.has(key) && !existingByKey.has(key)) existingByKey.set(key, fact);
  });

  const measureId = dataset.measures.find((measure) => measure.id === "sales")?.id
    ?? dataset.measures[0]?.id
    ?? "sales";
  const facts = leafCoordinates.map((coordinates) => {
    const existing = existingByKey.get(coordinateKey(coordinates, dimensionIds));
    if (existing) return existing;
    return {
      coordinates,
      measures: { [measureId]: randomSalesValue(random) },
    };
  });

  return { ...dataset, facts };
};
