export type OperationType = "original" | "slice" | "dice" | "rollup" | "drilldown";

export interface AxisMapping {
  x: string;
  y: string;
  z: string;
}

export interface SliceOperation {
  type: "slice";
  dimensionId: string;
  memberId: string;
}

export interface DiceOperation {
  type: "dice";
  selections: Record<string, string[]>;
}

export interface RollupOperation {
  type: "rollup";
  dimensionId: string;
  targetLevelId: string;
}

export interface DrilldownOperation {
  type: "drilldown";
  dimensionId: string;
  targetLevelId: string;
}

export interface OriginalOperation {
  type: "original";
}

export type OperationConfig =
  | OriginalOperation
  | SliceOperation
  | DiceOperation
  | RollupOperation
  | DrilldownOperation;

export interface OperationSettings {
  activeOperation: OperationType;
  slice: Omit<SliceOperation, "type">;
  dice: Omit<DiceOperation, "type">;
  rollup: Omit<RollupOperation, "type">;
  drilldown: Omit<DrilldownOperation, "type">;
}

export interface WorkspaceState {
  dataset: import("./cube").CubeDataset;
  axisMapping: AxisMapping;
  activeLevels: Record<string, string>;
  operations: OperationSettings;
}
