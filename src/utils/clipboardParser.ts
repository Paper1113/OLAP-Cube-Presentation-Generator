import type { CubeDataset, FactRecord } from "../models/cube";

export interface ClipboardParseResult {
  facts: FactRecord[];
  errors: string[];
}

const normalise = (value: string): string => value.trim().toLocaleLowerCase();

export const parseFactClipboard = (text: string, dataset: CubeDataset): ClipboardParseResult => {
  const lines = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    return { facts: [], errors: ["Paste a header row followed by at least one fact row."] };
  }

  const headers = lines[0].split("\t").map((header) => header.trim());
  const columnByHeader = new Map(headers.map((header, index) => [normalise(header), index]));
  const expectedHeaders = [...dataset.dimensions.map((dimension) => dimension.name), dataset.measures[0]?.name ?? ""];
  const missingHeaders = expectedHeaders.filter((header) => !columnByHeader.has(normalise(header)));
  if (missingHeaders.length > 0) {
    return { facts: [], errors: [`Missing required column(s): ${missingHeaders.join(", ")}.`] };
  }

  const measure = dataset.measures[0];
  if (!measure) return { facts: [], errors: ["Add a measure before importing facts."] };
  const facts: FactRecord[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, rowIndex) => {
    const values = line.split("\t");
    const coordinates: Record<string, string> = {};
    let rowValid = true;
    dataset.dimensions.forEach((dimension) => {
      const column = columnByHeader.get(normalise(dimension.name));
      const pastedValue = column === undefined ? "" : values[column]?.trim() ?? "";
      const matches = dimension.levels
        .flatMap((level) => level.members)
        .filter((member) => normalise(member.label) === normalise(pastedValue));
      if (matches.length === 0) {
        errors.push(`Row ${rowIndex + 2}: ${pastedValue || "(blank)"} is not a ${dimension.name} member.`);
        rowValid = false;
      } else if (matches.length > 1) {
        errors.push(`Row ${rowIndex + 2}: ${pastedValue} matches multiple ${dimension.name} members. Use distinct labels.`);
        rowValid = false;
      } else {
        coordinates[dimension.id] = matches[0].id;
      }
    });

    const measureColumn = columnByHeader.get(normalise(measure.name));
    const measureText = measureColumn === undefined ? "" : values[measureColumn]?.trim() ?? "";
    const measureValue = Number(measureText);
    if (!measureText || !Number.isFinite(measureValue)) {
      errors.push(`Row ${rowIndex + 2}: ${measureText || "(blank)"} is not a numeric ${measure.name} value.`);
      rowValid = false;
    }

    if (rowValid) facts.push({ coordinates, measures: { [measure.id]: measureValue } });
  });

  return { facts, errors };
};
