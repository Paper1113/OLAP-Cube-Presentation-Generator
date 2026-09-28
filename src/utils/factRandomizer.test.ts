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
    expect(fact.coordinates.product).toBe(lowestLevelMembers(product)[0].id);
    const location = demo.dimensions.find((dimension) => dimension.id === "location")!;
    expect(fact.coordinates.location).toBe(lowestLevelMembers(location)[0].id);
    expect(validateDataset({ ...demo, facts: [fact] })).toContain(
      "Fact row 1 has a non-numeric Sales value.",
    );
  });

  it("chooses lowest-level members and avoids the current selection when possible", () => {
    const members = lowestLevelMembers(product);
    expect(members).toHaveLength(4);
    expect(randomMemberId(product, undefined, () => 0)).toBe(members[0].id);
    expect(randomMemberId(product, undefined, () => 0.999)).toBe(members.at(-1)?.id);
    expect(randomMemberId(product, members[0].id, () => 0)).toBe(members[1].id);
  });

  it("handles a dimension without members and generates inclusive whole-number sales", () => {
    const emptyDimension: Dimension = { id: "empty", name: "Empty", levels: [] };

    expect(randomMemberId(emptyDimension)).toBeUndefined();
    expect(randomSalesValue(() => 0)).toBe(RANDOM_SALES_MIN);
    expect(randomSalesValue(() => 0.999_999)).toBe(RANDOM_SALES_MAX);
    expect(randomSalesValue(() => 0.5, 10, 12)).toBe(11);
  });
});
