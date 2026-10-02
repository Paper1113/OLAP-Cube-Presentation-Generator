import type { CubeDataset } from "../../models/cube";
import type { Dimension } from "../../models/dimension";
import { HierarchyEditor } from "./HierarchyEditor";

interface DimensionEditorProps {
  dataset: CubeDataset;
  activeLevels: Record<string, string>;
  onDatasetChange: (dataset: CubeDataset) => void;
  onActiveLevelsChange: (levels: Record<string, string>) => void;
}

export const DimensionEditor = ({
  dataset,
  activeLevels,
  onDatasetChange,
  onActiveLevelsChange,
}: DimensionEditorProps) => {
  const updateDimension = (nextDimension: Dimension) => {
    onDatasetChange({
      ...dataset,
      dimensions: dataset.dimensions.map((dimension) => dimension.id === nextDimension.id ? nextDimension : dimension),
    });
  };

  return (
    <section className="editor-section" aria-labelledby="dimensions-heading">
      <h2 id="dimensions-heading">Dimensions and hierarchies</h2>
      <p className="hint">Facts can stay at a lower level. The cube derives higher-level totals with SUM.</p>
      {dataset.dimensions.map((dimension) => {
        const levels = [...dimension.levels].sort((left, right) => left.order - right.order);
        return (
          <details className="dimension-editor" key={dimension.id}>
            <summary>{dimension.name}</summary>
            <label>
              Dimension name
              <input value={dimension.name} onChange={(event) => updateDimension({ ...dimension, name: event.target.value })} />
            </label>
            <label>
              Original cube level
              <select
                value={levels.some(level => level.id === (activeLevels[dimension.id] ?? levels.at(-1)?.id)) ? activeLevels[dimension.id] ?? levels.at(-1)?.id : ""}
                onChange={(event) => onActiveLevelsChange({ ...activeLevels, [dimension.id]: event.target.value })}
              >
                <option value="" disabled>請重新選擇層級 / Select a level again</option>
                {levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
              </select>
            </label>
            <HierarchyEditor dimension={dimension} onChange={updateDimension} />
          </details>
        );
      })}
    </section>
  );
};
