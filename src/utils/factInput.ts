import type { FactRecord } from "../models/cube";

const completeFiniteDecimalPattern = /^[+-]?(?:(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)$/;

export const isCompleteFiniteDecimal = (raw: string): boolean =>
  completeFiniteDecimalPattern.test(raw.trim()) && Number.isFinite(Number(raw));

export const factMeasureError = (fact: FactRecord, measureId: string): string | undefined => {
  const raw = fact.measureInputs?.[measureId];
  if (raw !== undefined) {
    if (raw.trim() === "") return "Enter a Sales value; blank is unfinished, not zero.";
    if (!isCompleteFiniteDecimal(raw) || !Number.isFinite(fact.measures[measureId])) {
      return "Enter a valid finite decimal number for Sales.";
    }
  }
  if (!Number.isFinite(fact.measures[measureId])) return "Enter a finite Sales value.";
};

export const setFactMeasureInput = (fact: FactRecord, measureId: string, raw: string): FactRecord => {
  const measures = { ...fact.measures };
  const measureInputs = { ...fact.measureInputs };
  const valid = isCompleteFiniteDecimal(raw);
  if (valid) {
    const value = Number(raw);
    measures[measureId] = value;
    // Keep a non-canonical but valid representation (1.0, 1e2, .5, etc.)
    // while the user is still editing so the next keystroke uses the raw text.
    if (raw.trim() === String(value)) delete measureInputs[measureId];
    else measureInputs[measureId] = raw;
  }
  else { delete measures[measureId]; measureInputs[measureId] = raw; }
  return { ...fact, measures, measureInputs };
};

export const commitFactMeasureInput = (fact: FactRecord, measureId: string): FactRecord => {
  const raw = fact.measureInputs?.[measureId];
  if (raw === undefined || !isCompleteFiniteDecimal(raw) || !Number.isFinite(fact.measures[measureId])) return fact;
  const measureInputs = { ...fact.measureInputs };
  delete measureInputs[measureId];
  return { ...fact, measureInputs };
};
