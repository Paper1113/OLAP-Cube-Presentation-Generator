import type { FactRecord } from "../models/cube";

const completeFiniteDecimalPattern = /^[+-]?(?:(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)$/;

/**
 * Incomplete numeric drafts while the user is still typing, including decimal
 * mantissas with unfinished exponents: `1.`, `1e`, `1.2e`, `1.2e-`, `.5e`, `-`, `.`.
 */
const incompleteNumericDraftPattern = /^[+-]?(?:(?:\d+\.\d*|\.\d+|\d+)[eE][+-]?|\d+\.\d*|\.)?$/;

export const isCompleteFiniteDecimal = (raw: string): boolean =>
  completeFiniteDecimalPattern.test(raw.trim()) && Number.isFinite(Number(raw));

export const isIncompleteNumericDraft = (raw: string): boolean => {
  const trimmed = raw.trim();
  if (trimmed === "") return false;
  return incompleteNumericDraftPattern.test(trimmed) && !isCompleteFiniteDecimal(trimmed);
};

export const factMeasureError = (fact: FactRecord, measureId: string): string | undefined => {
  const raw = fact.measureInputs?.[measureId];
  if (raw !== undefined) {
    if (raw.trim() === "") return "Enter a Sales value; blank is unfinished, not zero.";
    if (isIncompleteNumericDraft(raw) && Number.isFinite(fact.measures[measureId])) {
      return "Finish editing the Sales value.";
    }
    if (!isCompleteFiniteDecimal(raw) || !Number.isFinite(fact.measures[measureId])) {
      return "Enter a valid finite decimal number for Sales.";
    }
    if (Number(raw) !== fact.measures[measureId]) {
      return "Sales text does not match the stored numeric value.";
    }
  }
  if (!Number.isFinite(fact.measures[measureId])) return "Enter a finite Sales value.";
};

export const setFactMeasureInput = (fact: FactRecord, measureId: string, raw: string): FactRecord => {
  const measures = { ...fact.measures };
  const measureInputs = { ...fact.measureInputs };
  const previous = fact.measures[measureId];
  const valid = isCompleteFiniteDecimal(raw);
  if (valid) {
    const value = Number(raw);
    measures[measureId] = value;
    // Keep a non-canonical but valid representation (1.0, 1e2, .5, etc.)
    // while the user is still editing so the next keystroke uses the raw text.
    if (raw.trim() === String(value)) delete measureInputs[measureId];
    else measureInputs[measureId] = raw;
  } else if (isIncompleteNumericDraft(raw) && typeof previous === "number" && Number.isFinite(previous)) {
    // Preserve the last good value so typing `42.` → `42.5` does not tear down the cube.
    measures[measureId] = previous;
    measureInputs[measureId] = raw;
  } else {
    delete measures[measureId];
    measureInputs[measureId] = raw;
  }
  return { ...fact, measures, measureInputs };
};

export const commitFactMeasureInput = (fact: FactRecord, measureId: string): FactRecord => {
  const raw = fact.measureInputs?.[measureId];
  if (raw === undefined) return fact;
  const measureInputs = { ...fact.measureInputs };
  // Complete non-canonical text, or incomplete drafts that still hold a finite value,
  // both clear back to the stored numeric measure on blur.
  if (
    (isCompleteFiniteDecimal(raw) || isIncompleteNumericDraft(raw))
    && Number.isFinite(fact.measures[measureId])
  ) {
    delete measureInputs[measureId];
    return { ...fact, measureInputs };
  }
  return fact;
};
