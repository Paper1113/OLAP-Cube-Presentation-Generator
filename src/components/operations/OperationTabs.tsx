import type { CubeDataset } from "../../models/cube";
import type { OperationSettings, OperationType } from "../../models/operation";
import { getLevel, orderedLevels } from "../../engine/hierarchy";
import { DicePanel } from "./DicePanel";
import { DrilldownPanel } from "./DrilldownPanel";
import { RollupPanel } from "./RollupPanel";
import { SlicePanel } from "./SlicePanel";

export interface OperationTabsProps {
  dataset: CubeDataset;
  activeLevels: Record<string, string>;
  operations: OperationSettings;
  onOperationsChange: (operations: OperationSettings) => void;
}

const tabs: Array<{ id: OperationType; label: string }> = [
  { id: "original", label: "Original" },
  { id: "slice", label: "Slice" },
  { id: "dice", label: "Dice" },
  { id: "rollup", label: "Roll-up" },
  { id: "drilldown", label: "Drill-down" },
];

const activeLevelName = (
  dimension: CubeDataset["dimensions"][number],
  activeLevels: Record<string, string>,
): string => {
  const selectedLevel = activeLevels[dimension.id]
    ? getLevel(dimension, activeLevels[dimension.id])
    : undefined;
  if (activeLevels[dimension.id] && !selectedLevel) return "請重新選擇層級 / Select a level again";
  return selectedLevel?.name ?? orderedLevels(dimension).at(-1)?.name ?? "No level";
};

/** Switch OLAP operations and expose the appropriate configuration controls. */
export const OperationTabs = ({
  dataset,
  activeLevels,
  operations,
  onOperationsChange,
}: OperationTabsProps) => {
  const activeOperation = tabs.some((tab) => tab.id === operations.activeOperation)
    ? operations.activeOperation
    : "original";
  const panelId = `operation-panel-${activeOperation}`;

  return (
    <section className="operations operation-tabs-container" aria-labelledby="operations-heading">
      <div className="operation-tabs__header">
        <h2 id="operations-heading">OLAP operations</h2>
        <p className="hint">Choose an operation to transform the current cube view. Raw facts remain unchanged.</p>
      </div>
      <div className="operation-tabs__list" role="tablist" aria-label="OLAP operations">
        {tabs.map((tab) => {
          const isActive = activeOperation === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`operation-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`operation-panel-${tab.id}`}
              className={`operation-tab${isActive ? " active operation-tab--active" : ""}`}
              onClick={() => onOperationsChange({ ...operations, activeOperation: tab.id })}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id={panelId}
        className="operation-tabs__content"
        role="tabpanel"
        aria-labelledby={`operation-tab-${activeOperation}`}
      >
        {activeOperation === "original" && (
          <section className="operation-panel original-panel" aria-labelledby="original-panel-heading">
            <div className="operation-panel__intro">
              <h3 id="original-panel-heading">Original OLAP Cube</h3>
              <p>This cube shows the selected measure across the currently visible hierarchy levels.</p>
            </div>
            <dl className="operation-level-summary">
              {dataset.dimensions.map((dimension) => (
                <div key={dimension.id}>
                  <dt>{dimension.name}</dt>
                  <dd>{activeLevelName(dimension, activeLevels)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {activeOperation === "slice" && (
          <SlicePanel
            dataset={dataset}
            activeLevels={activeLevels}
            slice={operations.slice}
            onChange={(slice) => onOperationsChange({ ...operations, slice })}
          />
        )}
        {activeOperation === "dice" && (
          <DicePanel
            dataset={dataset}
            activeLevels={activeLevels}
            dice={operations.dice}
            onChange={(dice) => onOperationsChange({ ...operations, dice })}
          />
        )}
        {activeOperation === "rollup" && (
          <RollupPanel
            dataset={dataset}
            activeLevels={activeLevels}
            rollup={operations.rollup}
            onChange={(rollup) => onOperationsChange({ ...operations, rollup })}
          />
        )}
        {activeOperation === "drilldown" && (
          <DrilldownPanel
            dataset={dataset}
            activeLevels={activeLevels}
            drilldown={operations.drilldown}
            onChange={(drilldown) => onOperationsChange({ ...operations, drilldown })}
          />
        )}
      </div>
    </section>
  );
};
