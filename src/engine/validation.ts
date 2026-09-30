import type { CubeDataset } from "../models/cube";
import { getMember, getLevel } from "./hierarchy";

export const validateDataset = (dataset: CubeDataset): string[] => {
  const errors: string[] = [];
  if (dataset.measures.length === 0) errors.push("Add a SUM measure before rendering a cube.");
  if (dataset.dimensions.length !== 3) errors.push("Exactly three dimensions are required.");
  const dimensionIds = new Set<string>();

  dataset.dimensions.forEach((dimension) => {
    if (dimensionIds.has(dimension.id)) errors.push(`Duplicate dimension ID: ${dimension.id}.`);
    dimensionIds.add(dimension.id);
    if (dimension.levels.length === 0) {
      errors.push(`${dimension.name} needs at least one hierarchy level.`);
      return;
    }
    const levelIds = new Set<string>();
    const rootOrder = Math.min(...dimension.levels.map((level) => level.order));
    const memberIds = new Set<string>();
    dimension.levels.forEach((level) => {
      if (levelIds.has(level.id)) errors.push(`Duplicate level ID in ${dimension.name}: ${level.id}.`);
      levelIds.add(level.id);
      level.members.forEach((member) => {
        if (memberIds.has(member.id)) errors.push(`Duplicate member ID in ${dimension.name}: ${member.id}.`);
        memberIds.add(member.id);
        if (member.levelId !== level.id) errors.push(`${member.label} has an incorrect level reference.`);
        if (level.order > rootOrder && !member.parentMemberId) {
          errors.push(`${member.label} needs a parent member because it is below the root level.`);
        }
        if (member.parentMemberId && !getMember(dimension, member.parentMemberId)) {
          errors.push(`${member.label} references a missing parent member.`);
        }
      });
    });
  });

  dataset.facts.forEach((fact, index) => {
    dataset.dimensions.forEach((dimension) => {
      const memberId = fact.coordinates[dimension.id];
      if (!memberId || !getMember(dimension, memberId)) {
        errors.push(`Fact row ${index + 1} references an invalid ${dimension.name} member.`);
      }
    });
    dataset.measures.forEach((measure) => {
      const value = fact.measures[measure.id];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`Fact row ${index + 1} has a non-numeric ${measure.name} value.`);
      }
    });
  });

  dataset.dimensions.forEach((dimension) => {
    dimension.levels.forEach((level) => {
      level.members.forEach((member) => {
        if (member.parentMemberId) {
          const parent = getMember(dimension, member.parentMemberId);
          const parentLevel = parent ? getLevel(dimension, parent.levelId) : undefined;
          const currentLevel = getLevel(dimension, level.id);
          if (parentLevel && currentLevel && parentLevel.order >= currentLevel.order) {
            errors.push(`${member.label} has an invalid hierarchy parent.`);
          }
        }
      });
    });
  });

  return errors;
};
