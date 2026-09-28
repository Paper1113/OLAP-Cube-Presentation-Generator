import { describe, expect, it } from "vitest";
import { createIkeaDemoDataset } from "../demo/ikeaDemo";
import { validateDataset } from "../engine/validation";
import type { Dimension } from "../models/dimension";
import {
  createBlankFact,
  lowestLevelMembers,
  randomMemberId,
  randomSalesValue,
  RANDOM_SALES_MAX,
  RANDOM_SALES_MIN,
} from "./factRandomizer";

const demo = createIkeaDemoDataset();
const product = demo.dimensions.find((dimension) => dimension.id === "product")!;

describe("fact entry helpers", () => {
  it("creates a manual fact with a blank measure instead of a zero", () => {
    const fact = createBlankFact(demo);

    expect(fact.measures.sales).toBeUndefined();
    expect(fact.coordinates.product).toBe("product-sofa");
    expect(fact.coordinates.location).toBe("location-perth");
    expect(validateDataset({ ...demo, facts: [fact] })).toContain(
      "Fact row 1 has a non-numeric Sales value.",
    );
  });

  it("chooses lowest-level members and avoids the current selection when possible", () => {
    expect(lowestLevelMembers(product).map((member) => member.id)).toEqual([
      "product-sofa",
      "product-armchair",
      "product-bookcase",
      "product-bed-frame",
    ]);
    expect(randomMemberId(product, undefined, () => 0)).toBe("product-sofa");
    expect(randomMemberId(product, undefined, () => 0.999)).toBe("product-bed-frame");
    expect(randomMemberId(product, "product-sofa", () => 0)).toBe("product-armchair");
  });

  it("handles a dimension without members and generates inclusive whole-number sales", () => {
    const emptyDimension: Dimension = { id: "empty", name: "Empty", levels: [] };

    expect(randomMemberId(emptyDimension)).toBeUndefined();
    expect(randomSalesValue(() => 0)).toBe(RANDOM_SALES_MIN);
    expect(randomSalesValue(() => 0.999_999)).toBe(RANDOM_SALES_MAX);
    expect(randomSalesValue(() => 0.5, 10, 12)).toBe(11);
  });
});
