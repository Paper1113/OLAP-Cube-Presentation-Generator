import type { CubeDataset } from "../../models/cube";
import type { AxisMapping } from "../../models/operation";

interface DatasetEditorProps {
  dataset: CubeDataset;
  axisMapping: AxisMapping;
  onDatasetChange: (dataset: CubeDataset) => void;
  onAxisMappingChange: (axisMapping: AxisMapping) => void;
}

export const DatasetEditor = ({
  dataset,
  axisMapping,
  onDatasetChange,
  onAxisMappingChange,
}: DatasetEditorProps) => {
  const updateMeasureName = (name: string) => {
    const measure = dataset.measures[0];
    if (!measure) return;
    onDatasetChange({ ...dataset, measures: [{ ...measure, name }] });
  };

  const axisOptions = dataset.dimensions.map((dimension) => (
    <option key={dimension.id} value={dimension.id}>{dimension.name}</option>
  ));

  return (
    <section className="editor-section" aria-labelledby="dataset-heading">
      <h2 id="dataset-heading">Dataset</h2>
      <label>
        Dataset title
        <input
          value={dataset.title}
          onChange={(event) => onDatasetChange({ ...dataset, title: event.target.value })}
        />
      </label>
      <label>
        Measure name
        <input value={dataset.measures[0]?.name ?? ""} onChange={(event) => updateMeasureName(event.target.value)} />
      </label>
      <fieldset className="axis-mapping">
        <legend>Axis mapping</legend>
        {(["x", "y", "z"] as const).map((axis) => (
          <label key={axis}>
            {axis.toUpperCase()} axis
            <select
              value={axisMapping[axis]}
              onChange={(event) => onAxisMappingChange({ ...axisMapping, [axis]: event.target.value })}
            >
              {axisOptions}
            </select>
          </label>
        ))}
      </fieldset>
    </section>
  );
};
