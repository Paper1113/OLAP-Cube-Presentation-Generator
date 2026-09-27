import type { CubeDataset } from "../models/cube";
import type { AxisMapping, RollupOperation } from "../models/operation";
import { createCubeView, type CubeBuildResult } from "./cubeEngine";

export const applyRollup = (
  dataset: CubeDataset,
  axisMapping: AxisMapping,
  activeLevels: Record<string, string>,
  operation: RollupOperation,
): CubeBuildResult => createCubeView(dataset, { axisMapping, activeLevels, operation });
