import type { CubeDataset } from "../../models/cube";
import type { AxisMapping } from "../../models/operation";
import { AxisMappingEditor } from "./AxisMappingEditor";
import { DimensionEditor } from "./DimensionEditor";
import { FactGrid } from "./FactGrid";

interface AdvancedSettingsProps {
  dataset: CubeDataset;
  axisMapping: AxisMapping;
  activeLevels: Record<string, string>;
  onDatasetChange: (dataset: CubeDataset) => void;
  onAxisMappingChange: (axisMapping: AxisMapping) => void;
  onActiveLevelsChange: (activeLevels: Record<string, string>) => void;
  onSynchronizeFacts: () => void;
  onRefreshSales: () => void;
  onLoadSample: () => void;
  onReset: () => void;
}

/** Keeps manual editors available without making them part of the normal workflow. */
export const AdvancedSettings = ({
  dataset,
  axisMapping,
  activeLevels,
  onDatasetChange,
  onAxisMappingChange,
  onActiveLevelsChange,
  onSynchronizeFacts,
  onRefreshSales,
  onLoadSample,
  onReset,
}: AdvancedSettingsProps) => (
  <details className="advanced-settings">
    <summary>Advanced Settings</summary>
    <div className="advanced-settings__content">
      <p className="hint">Use these controls only when you want to customize the generated sample. Apply hierarchy changes to rebuild a complete leaf-level fact grid.</p>
      <AxisMappingEditor
        dataset={dataset}
        axisMapping={axisMapping}
        onAxisMappingChange={onAxisMappingChange}
      />
      <DimensionEditor
        dataset={dataset}
        activeLevels={activeLevels}
        onDatasetChange={onDatasetChange}
        onActiveLevelsChange={onActiveLevelsChange}
      />
      <section className="advanced-settings__sync" aria-labelledby="sync-facts-heading">
        <div>
          <h3 id="sync-facts-heading">Apply hierarchy changes</h3>
          <p>Rebuild the Time × Product × Location leaf combinations while retaining Sales values for coordinates that still exist.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onSynchronizeFacts}>Apply Changes &amp; Rebuild Facts</button>
      </section>
      <FactGrid dataset={dataset} onDatasetChange={onDatasetChange} onRefreshAllSales={onRefreshSales} />
      <div className="dataset-actions" aria-label="Dataset utilities">
        <button type="button" className="secondary-button" onClick={onLoadSample}>Load Furniture sample</button>
        <button type="button" className="text-button danger-button" onClick={onReset}>Reset dataset</button>
      </div>
    </div>
  </details>
);
