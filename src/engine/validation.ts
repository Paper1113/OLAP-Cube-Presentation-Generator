import type { CubeDataset } from "../models/cube";
import { getMember, getLevel, orderedLevels } from "./hierarchy";
import { isCompleteFiniteDecimal, isIncompleteNumericDraft } from "../utils/factInput";

export interface ValidateDatasetOptions {
  /**
   * When true, incomplete numeric drafts (e.g. `1.`) that still retain a finite
   * measure are allowed so the live preview can keep rendering while typing.
   * Export paths must leave this unset/false.
   */
  allowIncompleteDrafts?: boolean;
}

export const validateDataset = (
  dataset: CubeDataset,
  options: ValidateDatasetOptions = {},
): string[] => {
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
    const orders = new Set<number>();
    const levels = orderedLevels(dimension);
    const rootOrder = Math.min(...dimension.levels.map((level) => level.order));
    const memberIds = new Set<string>();
    dimension.levels.forEach((level) => {
      if (levelIds.has(level.id)) errors.push(`Duplicate level ID in ${dimension.name}: ${level.id}.`);
      levelIds.add(level.id);
      if (!Number.isFinite(level.order)) {
        errors.push(`${dimension.name} / ${level.name} has a non-finite level order.`);
      } else if (orders.has(level.order)) {
        errors.push(`${dimension.name} has duplicate level order ${level.order}.`);
      } else {
        orders.add(level.order);
      }
      if (level.members.length === 0) errors.push(`${dimension.name} / ${level.name} needs at least one member. Complete the hierarchy before rebuilding facts.`);
      level.members.forEach((member) => {
        if (memberIds.has(member.id)) errors.push(`Duplicate member ID in ${dimension.name}: ${member.id}.`);
        memberIds.add(member.id);
        if (member.levelId !== level.id) errors.push(`${member.label} has an incorrect level reference.`);
        if (Number.isFinite(level.order) && level.order > rootOrder && !member.parentMemberId) {
          errors.push(`${member.label} needs a parent member because it is below the root level.`);
        }
        if (member.parentMemberId && !getMember(dimension, member.parentMemberId)) {
          errors.push(`${member.label} references a missing parent member.`);
        }
      });
    });
    // Require strictly increasing orders after sort so hierarchy index math stays unambiguous.
    for (let index = 1; index < levels.length; index += 1) {
      if (Number.isFinite(levels[index - 1].order) && Number.isFinite(levels[index].order)
        && levels[index].order <= levels[index - 1].order) {
        errors.push(`${dimension.name} level orders must be unique and strictly increasing.`);
        break;
      }
    }
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
      const raw = fact.measureInputs?.[measure.id];
      if (raw !== undefined) {
        if (raw.trim() === "") {
          errors.push(`Fact row ${index + 1}: ${measure.name} is blank (unfinished, not zero). Enter a finite number.`);
        } else if (isIncompleteNumericDraft(raw) && typeof value === "number" && Number.isFinite(value)) {
          if (!options.allowIncompleteDrafts) {
            errors.push(`Fact row ${index + 1}: ${measure.name} is unfinished. Finish editing before exporting.`);
          }
        } else if (!isCompleteFiniteDecimal(raw) || typeof value !== "number" || !Number.isFinite(value)) {
          errors.push(`Fact row ${index + 1}: ${measure.name} is invalid. Enter a finite number.`);
        } else if (Number(raw) !== value) {
          errors.push(`Fact row ${index + 1}: ${measure.name} text does not match the stored numeric value.`);
        }
      } else if (typeof value !== "number" || !Number.isFinite(value)) {
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
