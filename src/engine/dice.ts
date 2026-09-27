import type { CubeDataset } from "../models/cube";
import type { AxisMapping, DiceOperation } from "../models/operation";
import { createCubeView, type CubeBuildResult } from "./cubeEngine";

export const applyDice = (
  dataset: CubeDataset,
  axisMapping: AxisMapping,
  activeLevels: Record<string, string>,
  operation: DiceOperation,
): CubeBuildResult => createCubeView(dataset, { axisMapping, activeLevels, operation });
