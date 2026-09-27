import { useState } from "react";
import type { CubeDataset, FactRecord } from "../../models/cube";
import { parseFactClipboard } from "../../utils/clipboardParser";

interface FactGridProps {
  dataset: CubeDataset;
  onDatasetChange: (dataset: CubeDataset) => void;
}

const firstFact = (dataset: CubeDataset): FactRecord => ({
  coordinates: Object.fromEntries(dataset.dimensions.map((dimension) => [
    dimension.id,
    [...dimension.levels].sort((left, right) => right.order - left.order)[0]?.members[0]?.id ?? "",
  ])),
  measures: { [dataset.measures[0]?.id ?? "measure"]: 0 },
});

export const FactGrid = ({ dataset, onDatasetChange }: FactGridProps) => {
  const [pasteText, setPasteText] = useState("");
  const [pasteMessages, setPasteMessages] = useState<string[]>([]);
  const measure = dataset.measures[0];

  const updateFact = (rowIndex: number, update: (fact: FactRecord) => FactRecord) => {
    onDatasetChange({
      ...dataset,
      facts: dataset.facts.map((fact, index) => index === rowIndex ? update(fact) : fact),
    });
  };

  const importClipboard = () => {
    const result = parseFactClipboard(pasteText, dataset);
    if (result.errors.length > 0) {
      setPasteMessages(result.errors);
      return;
    }
    onDatasetChange({ ...dataset, facts: [...dataset.facts, ...result.facts] });
    setPasteMessages([`Imported ${result.facts.length} fact row${result.facts.length === 1 ? "" : "s"}.`]);
    setPasteText("");
  };

  return (
    <section className="editor-section" aria-labelledby="facts-heading">
      <h2 id="facts-heading">Fact data</h2>
      <p className="hint">Use lower-level members where available. Higher-level values remain derived rather than stored.</p>
      <div className="fact-table-wrap">
        <table className="fact-table">
          <thead>
            <tr>
              {dataset.dimensions.map((dimension) => <th key={dimension.id} scope="col">{dimension.name}</th>)}
              <th scope="col">{measure?.name ?? "Measure"}</th>
              <th scope="col"><span className="visually-hidden">Remove row</span></th>
            </tr>
          </thead>
          <tbody>
            {dataset.facts.map((fact, rowIndex) => (
              <tr key={`${rowIndex}-${Object.values(fact.coordinates).join("-")}`}>
                {dataset.dimensions.map((dimension) => (
                  <td key={dimension.id}>
                    <select
                      aria-label={`${dimension.name} for row ${rowIndex + 1}`}
                      value={fact.coordinates[dimension.id] ?? ""}
                      onChange={(event) => updateFact(rowIndex, (current) => ({
                        ...current,
                        coordinates: { ...current.coordinates, [dimension.id]: event.target.value },
                      }))}
                    >
                      {dimension.levels.map((level) => (
                        <optgroup key={level.id} label={level.name}>
                          {level.members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                ))}
                <td>
                  <input
                    aria-label={`${measure?.name ?? "Measure"} for row ${rowIndex + 1}`}
                    type="number"
                    step="any"
                    value={fact.measures[measure?.id ?? ""] ?? 0}
                    onChange={(event) => updateFact(rowIndex, (current) => ({
                      ...current,
                      measures: { ...current.measures, [measure?.id ?? ""]: Number(event.target.value) },
                    }))}
                  />
                </td>
                <td><button type="button" className="icon-button danger-button" aria-label={`Remove fact row ${rowIndex + 1}`} onClick={() => onDatasetChange({ ...dataset, facts: dataset.facts.filter((_, index) => index !== rowIndex) })}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="secondary-button" onClick={() => onDatasetChange({ ...dataset, facts: [...dataset.facts, firstFact(dataset)] })}>+ Add fact row</button>
      <div className="paste-import">
        <label>
          Paste tab-separated Excel data
          <textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={`${dataset.dimensions.map((dimension) => dimension.name).join("\t")}\t${measure?.name ?? "Sales"}\n…`} />
        </label>
        <button type="button" className="secondary-button" onClick={importClipboard}>Import pasted rows</button>
        {pasteMessages.length > 0 && (
          <div className={pasteMessages[0].startsWith("Imported") ? "inline-success" : "inline-errors"} role="status">
            {pasteMessages.slice(0, 8).map((message) => <p key={message}>{message}</p>)}
            {pasteMessages.length > 8 && <p>…and {pasteMessages.length - 8} more errors.</p>}
          </div>
        )}
      </div>
    </section>
  );
};
