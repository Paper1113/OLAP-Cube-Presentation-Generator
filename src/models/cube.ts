import type { Dimension } from "./dimension";

export interface Measure {
  id: string;
  name: string;
  aggregation: "sum";
}

export interface FactRecord {
  coordinates: Record<string, string>;
  measures: Record<string, number>;
}

export interface CubeDataset {
  title: string;
  dimensions: Dimension[];
  measures: Measure[];
  facts: FactRecord[];
}

export interface CubeAxisMemberView {
  id: string;
  label: string;
}

export interface CubeAxisView {
  dimensionId: string;
  dimensionName: string;
  levelId: string;
  levelName: string;
  members: CubeAxisMemberView[];
}

export interface CubeCellView {
  xMemberId: string;
  yMemberId: string;
  zMemberId: string;
  value: number;
  hasData: boolean;
}

export interface CubeViewModel {
  datasetTitle: string;
  measure: Measure;
  x: CubeAxisView;
  y: CubeAxisView;
  z: CubeAxisView;
  cells: CubeCellView[];
  operationLabel: string;
  description: string;
}
