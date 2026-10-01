import { describe, expect, it } from "vitest";
import { setFactMeasureInput } from "./factInput";
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

  it("preserves a trailing decimal separator while the value is still being typed", () => {
    const updated = setFactMeasureInput(fact(), "sales", "1.");
    expect(updated.measures).toEqual({});
    expect(updated.measureInputs).toEqual({ sales: "1." });
  });
});
