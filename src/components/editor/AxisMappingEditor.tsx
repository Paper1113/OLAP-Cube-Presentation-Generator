import type { CubeDataset } from "../../models/cube";
import type { AxisMapping } from "../../models/operation";

interface AxisMappingEditorProps {
  dataset: CubeDataset;
  axisMapping: AxisMapping;
  onAxisMappingChange: (axisMapping: AxisMapping) => void;
}

/** Advanced-only axis assignment; measures remain the standard Sales measure. */
export const AxisMappingEditor = ({
  dataset,
  axisMapping,
  onAxisMappingChange,
}: AxisMappingEditorProps) => {
  const axisOptions = dataset.dimensions.map((dimension) => (
    <option key={dimension.id} value={dimension.id}>{dimension.name}</option>
  ));

  return (
    <section className="editor-section axis-mapping-editor" aria-labelledby="axis-mapping-heading">
      <h2 id="axis-mapping-heading">Axis mapping</h2>
      <p className="hint">Choose which of the three dimensions is drawn on each cube axis.</p>
      <fieldset className="axis-mapping">
        <legend>Cube axes</legend>
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
