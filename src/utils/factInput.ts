import type { FactRecord } from "../models/cube";

export const factMeasureError = (fact: FactRecord, measureId: string): string | undefined => {
  const raw = fact.measureInputs?.[measureId];
  if (raw !== undefined) return raw.trim() === ""
    ? "Enter a Sales value; blank is unfinished, not zero."
    : "Enter a valid finite decimal number for Sales.";
  if (!Number.isFinite(fact.measures[measureId])) return "Enter a finite Sales value.";
};

export const setFactMeasureInput = (fact: FactRecord, measureId: string, raw: string): FactRecord => {
  const measures = { ...fact.measures };
  const measureInputs = { ...fact.measureInputs };
  const valid = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw.trim()) && Number.isFinite(Number(raw));
  if (valid) { measures[measureId] = Number(raw); delete measureInputs[measureId]; }
  else { delete measures[measureId]; measureInputs[measureId] = raw; }
  return { ...fact, measures, measureInputs };
};
