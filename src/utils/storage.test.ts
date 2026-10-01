import { afterEach, expect, it, vi } from "vitest";
import { generateIndustryWorkspace } from "../generator/datasetGenerator";
import { loadWorkspace, saveWorkspace } from "./storage";

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

it("round-trips unfinished Sales input instead of discarding the workspace", () => {
  const workspace = generateIndustryWorkspace({ title: "Saved unfinished", industryId: "furniture-home" });
  workspace.dataset.facts[0].measures = {};
  workspace.dataset.facts[0].measureInputs = { sales: "" };
  let stored = "";
  vi.stubGlobal("window", { localStorage: {
    getItem: () => stored,
    setItem: (_key: string, value: string) => { stored = value; },
  } });
  expect(saveWorkspace(workspace)).toBe(true);
  expect(loadWorkspace()?.dataset.facts[0]).toEqual(workspace.dataset.facts[0]);
});

it("reports blocked localStorage writes", () => {
  const workspace = generateIndustryWorkspace({ title: "Blocked", industryId: "furniture-home" });
  vi.stubGlobal("window", { localStorage: {
    setItem: () => { throw new Error("quota"); },
  } });
  expect(saveWorkspace(workspace)).toBe(false);
});
