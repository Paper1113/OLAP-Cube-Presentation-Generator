import { afterEach, expect, it, vi } from "vitest";
import { generateIndustryWorkspace } from "../generator/datasetGenerator";
import { loadWorkspace } from "./storage";

afterEach(() => vi.unstubAllGlobals());
const load = (value: unknown) => {
  vi.stubGlobal("window", { localStorage: { getItem: () => JSON.stringify(value) } });
  return loadWorkspace();
};

it("loads compatible workspaces without optional appearance or generation metadata", () => {
  const w = generateIndustryWorkspace({ title: "Saved", industryId: "furniture-home" });
  delete w.appearance;
  delete w.generation;
  expect(load(w)).toEqual(w);
});

it("rejects structurally incomplete saved data before app initialization", () => {
  const w = generateIndustryWorkspace({ title: "Saved", industryId: "furniture-home" });
  expect(load({ ...w, operations: undefined })).toBeNull();
  expect(load({ ...w, dataset: { ...w.dataset, dimensions: [null, null, null] } })).toBeNull();
  expect(load({ ...w, operations: { ...w.operations, dice: { selections: { time: null } } } })).toBeNull();
  expect(load({ ...w, axisMapping: {} })).toBeNull();
});
