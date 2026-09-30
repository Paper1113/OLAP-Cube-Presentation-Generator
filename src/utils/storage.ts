import type { WorkspaceState } from "../models/operation";

const STORAGE_KEY = "olap-cube-presentation-generator:v1";

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (value: unknown): boolean => record(value) && Object.values(value).every((entry) => typeof entry === "string");
const arrayOf = (value: unknown, check: (entry: unknown) => boolean): boolean =>
  Array.isArray(value) && value.every(check);

/** Check persisted structure before any renderer or migration dereferences it. */
export const isWorkspaceState = (value: unknown): value is WorkspaceState => {
  if (!record(value) || !record(value.dataset) || !record(value.operations)) return false;
  const { dataset, operations } = value;
  const transition = (entry: unknown) => record(entry)
    && typeof entry.dimensionId === "string" && typeof entry.targetLevelId === "string"
    && (entry.sourceLevelId === undefined || typeof entry.sourceLevelId === "string");
  return typeof dataset.title === "string"
    && arrayOf(dataset.dimensions, (dimension) => record(dimension)
      && typeof dimension.id === "string" && typeof dimension.name === "string"
      && arrayOf(dimension.levels, (level) => record(level)
        && typeof level.id === "string" && typeof level.name === "string"
        && typeof level.order === "number" && Number.isFinite(level.order)
        && arrayOf(level.members, (member) => record(member)
          && typeof member.id === "string" && typeof member.label === "string"
          && typeof member.levelId === "string"
          && (member.parentMemberId === undefined || typeof member.parentMemberId === "string"))))
    && arrayOf(dataset.measures, (measure) => record(measure)
      && typeof measure.id === "string" && typeof measure.name === "string" && measure.aggregation === "sum")
    && arrayOf(dataset.facts, (fact) => record(fact) && strings(fact.coordinates)
      && record(fact.measures) && Object.values(fact.measures).every((entry) => typeof entry === "number" && Number.isFinite(entry)))
    && record(value.axisMapping) && ["x", "y", "z"].every((axis) => typeof (value.axisMapping as Record<string, unknown>)[axis] === "string")
    && strings(value.activeLevels)
    && typeof operations.activeOperation === "string"
    && ["original", "slice", "dice", "rollup", "drilldown"].includes(operations.activeOperation)
    && record(operations.slice) && typeof operations.slice.dimensionId === "string" && typeof operations.slice.memberId === "string"
    && record(operations.dice) && record(operations.dice.selections)
    && Object.values(operations.dice.selections).every((selection) => arrayOf(selection, (entry) => typeof entry === "string"))
    && transition(operations.rollup) && transition(operations.drilldown);
};

export const loadWorkspace = (): WorkspaceState | null => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return isWorkspaceState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveWorkspace = (workspace: WorkspaceState): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch {
    // The app remains usable when local storage is blocked or full.
  }
};

export const clearWorkspace = (): void => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else is needed if the browser blocks storage access.
  }
};
