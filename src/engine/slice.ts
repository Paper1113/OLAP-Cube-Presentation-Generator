import type { CubeDataset } from "../models/cube";
import type { AxisMapping, SliceOperation } from "../models/operation";
import { createCubeView, type CubeBuildResult } from "./cubeEngine";

export const applySlice = (
  dataset: CubeDataset,
  axisMapping: AxisMapping,
  activeLevels: Record<string, string>,
  operation: SliceOperation,
): CubeBuildResult => createCubeView(dataset, { axisMapping, activeLevels, operation });
