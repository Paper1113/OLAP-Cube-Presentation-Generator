import type { CubeDataset } from "../../models/cube";
import type { Dimension, DimensionLevel } from "../../models/dimension";
import type { OperationSettings } from "../../models/operation";
import { canDrillDown } from "../../engine/cubeEngine";
import { getLevel, orderedLevels } from "../../engine/hierarchy";

export interface DrilldownPanelProps {
  dataset: CubeDataset;
  activeLevels: Record<string, string>;
  drilldown: OperationSettings["drilldown"];
  onChange: (drilldown: OperationSettings["drilldown"]) => void;
}

const currentLevel = (
  dimension: Dimension,
  activeLevels: Record<string, string>,
): DimensionLevel | undefined => {
  const requestedId = activeLevels[dimension.id];
  if (requestedId) {
    const requestedLevel = getLevel(dimension, requestedId);
    return requestedLevel;
  }
  return orderedLevels(dimension).at(-1);
};

const lowerLevels = (dimension: Dimension, sourceLevelId: string | undefined): DimensionLevel[] => {
  const levels = orderedLevels(dimension);
  const sourceIndex = levels.findIndex((level) => level.id === sourceLevelId);
  return sourceIndex >= 0 ? levels.slice(sourceIndex + 1) : [];
};

const hasAvailableTarget = (
  dataset: CubeDataset,
  activeLevels: Record<string, string>,
  dimension: Dimension,
): boolean => lowerLevels(dimension, currentLevel(dimension, activeLevels)?.id)
  .some((level) => canDrillDown(dataset, activeLevels, dimension.id, level.id));

/** Configure a fact-backed transition to a lower hierarchy level. */
export const DrilldownPanel = ({ dataset, activeLevels, drilldown, onChange }: DrilldownPanelProps) => {
  const drilldownDimensions = dataset.dimensions.filter((dimension) =>
    hasAvailableTarget(dataset, activeLevels, dimension),
  );
  const selectedDimension = dataset.dimensions.find((dimension) => dimension.id === drilldown.dimensionId)
    ?? drilldownDimensions[0]
    ?? dataset.dimensions[0];
  const sourceLevel = selectedDimension ? currentLevel(selectedDimension, activeLevels) : undefined;
  const targets = selectedDimension ? lowerLevels(selectedDimension, sourceLevel?.id) : [];
  const availableTargets = selectedDimension
    ? targets.filter((level) => canDrillDown(dataset, activeLevels, selectedDimension.id, level.id))
    : [];
  const targetIsAvailable = availableTargets.some((level) => level.id === drilldown.targetLevelId);

  const chooseDimension = (dimensionId: string) => {
    const dimension = dataset.dimensions.find((candidate) => candidate.id === dimensionId);
    const nextTarget = dimension
      ? lowerLevels(dimension, currentLevel(dimension, activeLevels)?.id)
        .find((level) => canDrillDown(dataset, activeLevels, dimension.id, level.id))
      : undefined;
    onChange({ dimensionId, targetLevelId: nextTarget?.id ?? "" });
  };

  return (
    <section className="operation-panel drilldown-panel" aria-labelledby="drilldown-panel-heading">
      <div className="operation-panel__intro">
        <h3 id="drilldown-panel-heading">Drill-down expansion</h3>
        <p>Move to a lower hierarchy level only when lower-level fact data is available.</p>
      </div>
      {dataset.dimensions.length === 0 ? (
        <p className="inline-errors" role="status">Add a dimension before configuring a Drill-down.</p>
      ) : (
        <div className="operation-form">
          <label className="operation-field">
            Dimension
            <select value={selectedDimension?.id ?? ""} onChange={(event) => chooseDimension(event.target.value)}>
              {dataset.dimensions.map((dimension) => {
                const source = currentLevel(dimension, activeLevels);
                const targets = lowerLevels(dimension, source?.id);
                const available = hasAvailableTarget(dataset, activeLevels, dimension);
                const unavailableReason = !source
                  ? " (select Original cube level)"
                  : targets.length === 0
                    ? " (already at lowest level)"
                    : " (no lower-level fact data)";
                return (
                  <option key={dimension.id} value={dimension.id} disabled={!available}>
                    {dimension.name}{available ? "" : unavailableReason}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="operation-field">
            Current level
            <output className="operation-field__value">{sourceLevel?.name ?? "Select Original cube level again"}</output>
          </label>
          <label className="operation-field">
            Drill-down to
            <select
              value={targetIsAvailable ? drilldown.targetLevelId : ""}
              onChange={(event) => onChange({
                dimensionId: selectedDimension?.id ?? "",
                targetLevelId: event.target.value,
              })}
              disabled={availableTargets.length === 0}
            >
              <option value="" disabled>Select a lower level</option>
              {targets.map((level) => {
                const available = availableTargets.some((target) => target.id === level.id);
                return <option key={level.id} value={level.id} disabled={!available}>{level.name}{available ? "" : " (no fact data)"}</option>;
              })}
            </select>
          </label>
          {!sourceLevel ? (
            <p className="inline-errors" role="status">The Original cube level is unavailable. Select an existing level in Advanced Settings before configuring Drill-down.</p>
          ) : targets.length === 0 ? (
            <p className="inline-errors" role="status">This dimension is already at its lowest hierarchy level.</p>
          ) : availableTargets.length === 0 ? (
            <p className="inline-errors" role="status">No lower-level data is available for this Drill-down operation.</p>
          ) : !targetIsAvailable ? (
            <p className="inline-errors" role="status">Choose a lower hierarchy level with fact data.</p>
          ) : (
            <p className="operation-field__summary" role="status">
              {selectedDimension?.name}: {sourceLevel?.name} → {getLevel(selectedDimension as Dimension, drilldown.targetLevelId)?.name}
            </p>
          )}
        </div>
      )}
    </section>
  );
};
