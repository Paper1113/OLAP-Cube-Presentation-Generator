import { setFactMeasureInput, factMeasureError } from "../../utils/factInput";
import type { CubeDataset, FactRecord } from "../../models/cube";
import { getMember, orderedLevels } from "../../engine/hierarchy";
import { RANDOM_SALES_MAX, RANDOM_SALES_MIN, randomSalesValue } from "../../utils/factRandomizer";

interface FactGridProps {
  dataset: CubeDataset;
  onDatasetChange: (dataset: CubeDataset) => void;
  onRefreshAllSales: () => void;
}

const leafLevelName = (dimension: CubeDataset["dimensions"][number]): string =>
  orderedLevels(dimension).at(-1)?.name ?? dimension.name;

const coordinateLabel = (fact: FactRecord, dimension: CubeDataset["dimensions"][number]): string => {
  const memberId = fact.coordinates[dimension.id];
  return memberId ? getMember(dimension, memberId)?.label ?? "Missing member" : "Missing member";
};

/** Displays systematic fact coordinates as context; only Sales is editable. */
export const FactGrid = ({ dataset, onDatasetChange, onRefreshAllSales }: FactGridProps) => {
  const measure = dataset.measures.find((candidate) => candidate.id === "sales") ?? dataset.measures[0];

  const updateFact = (rowIndex: number, update: (fact: FactRecord) => FactRecord) => {
    onDatasetChange({
      ...dataset,
      facts: dataset.facts.map((fact, index) => index === rowIndex ? update(fact) : fact),
    });
  };

  const setSales = (fact: FactRecord, rawValue: string): FactRecord => {
    if (!measure) return fact;
    return setFactMeasureInput(fact, measure.id, rawValue);
  };

  return (
    <section className="editor-section fact-grid" aria-labelledby="facts-heading">
      <div className="fact-grid__header">
        <div>
          <h2 id="facts-heading">Fact Data</h2>
          <p className="hint">Coordinates come from the hierarchy. Edit or randomize only synthetic Sales values.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onRefreshAllSales}>
          ↻ Refresh All Sales
        </button>
      </div>
      <div className="fact-table-wrap">
        <table className="fact-table">
          <thead>
            <tr>
              {dataset.dimensions.map((dimension) => <th key={dimension.id} scope="col">{leafLevelName(dimension)}</th>)}
              <th scope="col">{measure?.name ?? "Sales"}</th>
            </tr>
          </thead>
          <tbody>
            {dataset.facts.map((fact, rowIndex) => (
              <tr key={`${rowIndex}-${Object.values(fact.coordinates).join("-")}`}>
                {dataset.dimensions.map((dimension) => (
                  <td key={dimension.id} className="fact-coordinate">{coordinateLabel(fact, dimension)}</td>
                ))}
                <td>
                  <div className="fact-cell-control">
                    <input
                      aria-label={`${measure?.name ?? "Sales"} for row ${rowIndex + 1}`}
                      type="text"
                      inputMode="decimal"
                      aria-invalid={measure ? Boolean(factMeasureError(fact, measure.id)) : false}
                      aria-describedby={`sales-error-${rowIndex}`}
                      value={measure ? fact.measureInputs?.[measure.id] ?? fact.measures[measure.id] ?? "" : ""}
                      onChange={(event) => updateFact(rowIndex, (current) => setSales(current, event.target.value))}
                      disabled={!measure}
                    />
                    <button
                      type="button"
                      className="fact-random-button"
                      aria-label={`Generate random ${measure?.name ?? "Sales"} for row ${rowIndex + 1}`}
                      title={`Generate a random value from ${RANDOM_SALES_MIN.toLocaleString()} to ${RANDOM_SALES_MAX.toLocaleString()}`}
                      disabled={!measure}
                      onClick={() => {
                        if (!measure) return;
                        updateFact(rowIndex, (current) => setFactMeasureInput(current, measure.id, String(randomSalesValue())));
                      }}
                    >
                      🎲
                    </button>
                  </div>
                  <small id={`sales-error-${rowIndex}`} role="status">{measure ? factMeasureError(fact, measure.id) : ""}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
