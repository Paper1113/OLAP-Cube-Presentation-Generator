import type { CubeDataset } from "../models/cube";
import type { AxisMapping, DrilldownOperation } from "../models/operation";
import { createCubeView, type CubeBuildResult } from "./cubeEngine";

export const applyDrilldown = (
  dataset: CubeDataset,
  axisMapping: AxisMapping,
  activeLevels: Record<string, string>,
  operation: DrilldownOperation,
): CubeBuildResult => createCubeView(dataset, { axisMapping, activeLevels, operation });
