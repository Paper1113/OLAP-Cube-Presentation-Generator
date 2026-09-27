import type { WorkspaceState } from "../models/operation";

const STORAGE_KEY = "olap-cube-presentation-generator:v1";

export const loadWorkspace = (): WorkspaceState | null => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as WorkspaceState) : null;
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
