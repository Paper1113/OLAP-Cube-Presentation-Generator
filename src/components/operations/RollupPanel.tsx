import type { CubeDataset } from "../../models/cube";
import type { Dimension, DimensionLevel } from "../../models/dimension";
import type { OperationSettings } from "../../models/operation";
import { getLevel, orderedLevels, rollupSourceLevel, hasFactDataAtLevel } from "../../engine/hierarchy";

export interface RollupPanelProps {
  dataset: CubeDataset;
  activeLevels: Record<string, string>;
  rollup: OperationSettings["rollup"];
  onChange: (rollup: OperationSettings["rollup"]) => void;
}

const currentLevel = (
  dimension: Dimension,
  activeLevels: Record<string, string>,
): DimensionLevel | undefined => {
  const requestedId = activeLevels[dimension.id];
  if (requestedId) return getLevel(dimension, requestedId);
  return orderedLevels(dimension).at(-1);
};

const higherLevels = (dimension: Dimension, sourceLevelId: string | undefined): DimensionLevel[] => {
  const levels = orderedLevels(dimension);
  const sourceIndex = levels.findIndex((level) => level.id === sourceLevelId);
  return sourceIndex > 0 ? levels.slice(0, sourceIndex) : [];
};

export interface RollupTransition {
  sourceLevel: DimensionLevel;
  targets: DimensionLevel[];
}

/**
 * Returns the normal current-level transition, or a leaf-to-current-level
 * transition when the visible default is already at the top of a dimension.
 * This keeps Product and Location roll-ups available alongside Drill-down-ready
 * Category and Country defaults without inventing any facts.
 */
const rollupTransition = (
  dimension: Dimension,
  activeLevels: Record<string, string>,
): RollupTransition | undefined => {
  const visibleLevel = currentLevel(dimension, activeLevels);
  const sourceLevel = rollupSourceLevel(dimension, visibleLevel?.id);
  if (!visibleLevel || !sourceLevel) return undefined;

  const visibleTargets = higherLevels(dimension, visibleLevel.id);
  if (visibleTargets.length > 0) return { sourceLevel: visibleLevel, targets: visibleTargets };

  return { sourceLevel, targets: [visibleLevel] };
};

export const availableRollupTransition = (
  dataset: CubeDataset,
  dimension: Dimension,
  activeLevels: Record<string, string>,
): RollupTransition | undefined => {
  const candidate = rollupTransition(dimension, activeLevels);
  if (!candidate || !hasFactDataAtLevel(dataset, dimension.id, candidate.sourceLevel.id)) {
    return undefined;
  }
  const targets = candidate.targets.filter((level) =>
    hasFactDataAtLevel(dataset, dimension.id, level.id),
  );
  return targets.length > 0 ? { ...candidate, targets } : undefined;
};

/** Configure an aggregation transition to a higher level in one hierarchy. */
export const RollupPanel = ({ dataset, activeLevels, rollup, onChange }: RollupPanelProps) => {
  const availableTransition = (dimension: Dimension) =>
    availableRollupTransition(dataset, dimension, activeLevels);
  const rollupDimensions = dataset.dimensions.filter((dimension) =>
    Boolean(availableTransition(dimension)),
  );
  const selectedDimension = dataset.dimensions.find((dimension) => dimension.id === rollup.dimensionId)
    ?? rollupDimensions[0]
    ?? dataset.dimensions[0];
  const transition = selectedDimension ? availableTransition(selectedDimension) : undefined;
  const configuredSourceLevel = selectedDimension && rollup.sourceLevelId
    ? getLevel(selectedDimension, rollup.sourceLevelId)
    : undefined;
  const sourceLevel = configuredSourceLevel?.id === transition?.sourceLevel.id
    ? configuredSourceLevel
    : transition?.sourceLevel;
  const targets = selectedDimension && sourceLevel
    ? higherLevels(selectedDimension, sourceLevel.id)
      .filter((level) => transition?.targets.some((target) => target.id === level.id) ?? false)
    : [];
  const targetIsAvailable = targets.some((level) => level.id === rollup.targetLevelId);

  const chooseDimension = (dimensionId: string) => {
    const dimension = dataset.dimensions.find((candidate) => candidate.id === dimensionId);
    const nextTransition = dimension ? availableTransition(dimension) : undefined;
    onChange({
      dimensionId,
      sourceLevelId: nextTransition?.sourceLevel.id,
      targetLevelId: nextTransition?.targets.at(-1)?.id ?? "",
    });
  };

  return (
    <section className="operation-panel rollup-panel" aria-labelledby="rollup-panel-heading">
      <div className="operation-panel__intro">
        <h3 id="rollup-panel-heading">Roll-up aggregation</h3>
        <p>Move to a higher hierarchy level. Values are derived from the raw facts using SUM.</p>
      </div>
      {dataset.dimensions.length === 0 ? (
        <p className="inline-errors" role="status">Add a dimension before configuring a Roll-up.</p>
      ) : (
        <div className="operation-form">
          <label className="operation-field">
            Dimension
            <select value={selectedDimension?.id ?? ""} onChange={(event) => chooseDimension(event.target.value)}>
              {dataset.dimensions.map((dimension) => {
                const available = Boolean(availableTransition(dimension));
                return <option key={dimension.id} value={dimension.id} disabled={!available}>{dimension.name}{available ? "" : " (no available aggregation)"}</option>;
              })}
            </select>
          </label>
          <label className="operation-field">
            Current level
            <output className="operation-field__value">{sourceLevel?.name ?? "No active level"}</output>
          </label>
          <label className="operation-field">
            Roll-up to
            <select
              value={targetIsAvailable ? rollup.targetLevelId : ""}
              onChange={(event) => onChange({
                dimensionId: selectedDimension?.id ?? "",
                sourceLevelId: sourceLevel?.id,
                targetLevelId: event.target.value,
              })}
              disabled={targets.length === 0}
            >
              <option value="" disabled>Select a higher level</option>
              {targets.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
            </select>
          </label>
          {targets.length === 0 ? (
            <p className="inline-errors" role="status">No higher-level transition with complete source data is available.</p>
          ) : !targetIsAvailable ? (
            <p className="inline-errors" role="status">Choose a higher hierarchy level for the Roll-up.</p>
          ) : (
            <p className="operation-field__summary" role="status">
              {selectedDimension?.name}: {sourceLevel?.name} → {getLevel(selectedDimension as Dimension, rollup.targetLevelId)?.name}
            </p>
          )}
        </div>
      )}
    </section>
  );
};
