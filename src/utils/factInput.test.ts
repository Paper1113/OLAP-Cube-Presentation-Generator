import { describe, expect, it } from "vitest";
import { commitFactMeasureInput, factMeasureError, setFactMeasureInput } from "./factInput";
import type { FactRecord } from "../models/cube";

const fact = (): FactRecord => ({
  coordinates: { time: "month-jan", product: "product-1", location: "city-1" },
  measures: { sales: 42 },
});

describe("fact measure input", () => {
  it("keeps blank input unfinished instead of converting it to zero", () => {
    const updated = setFactMeasureInput(fact(), "sales", "");
    expect(updated.measures).toEqual({});
    expect(updated.measureInputs).toEqual({ sales: "" });
  });

  it("keeps invalid input visible and separate from numeric measures", () => {
    const updated = setFactMeasureInput(fact(), "sales", "not-a-number");
    expect(updated.measures).toEqual({});
    expect(updated.measureInputs).toEqual({ sales: "not-a-number" });
  });

  it("accepts explicit zero and finite decimal input", () => {
    expect(setFactMeasureInput(fact(), "sales", "0")).toEqual({
      ...fact(),
      measureInputs: {},
      measures: { sales: 0 },
    });
    expect(setFactMeasureInput(fact(), "sales", "1.25e2").measures.sales).toBe(125);
  });

  it("preserves the last finite measure while a trailing decimal is still being typed", () => {
    const updated = setFactMeasureInput(fact(), "sales", "1.");
    expect(updated.measures).toEqual({ sales: 42 });
    expect(updated.measureInputs).toEqual({ sales: "1." });
    expect(factMeasureError(updated, "sales")).toBe("Finish editing the Sales value.");
  });

  it("reverts an incomplete draft to the retained measure on blur", () => {
    const draft = setFactMeasureInput(fact(), "sales", "1.");
    expect(commitFactMeasureInput(draft, "sales")).toEqual({
      ...fact(),
      measureInputs: {},
      measures: { sales: 42 },
    });
  });

  it("continues from a trailing-decimal draft into a complete value", () => {
    const draft = setFactMeasureInput(fact(), "sales", "42.");
    const completed = setFactMeasureInput(draft, "sales", "42.5");
    expect(completed.measures).toEqual({ sales: 42.5 });
    expect(completed.measureInputs).toEqual({});
    expect(factMeasureError(completed, "sales")).toBeUndefined();
  });

  it("preserves valid non-canonical text until blur", () => {
    const updated = setFactMeasureInput(fact(), "sales", "1.0");
    expect(updated.measures).toEqual({ sales: 1 });
    expect(updated.measureInputs).toEqual({ sales: "1.0" });
    expect(factMeasureError(updated, "sales")).toBeUndefined();
    expect(commitFactMeasureInput(updated, "sales")).toEqual({
      ...fact(),
      measureInputs: {},
      measures: { sales: 1 },
    });
  });

  it("preserves exponent notation while it is being edited", () => {
    const updated = setFactMeasureInput(fact(), "sales", "1e2");
    expect(updated.measures).toEqual({ sales: 100 });
    expect(updated.measureInputs).toEqual({ sales: "1e2" });
  });
});
