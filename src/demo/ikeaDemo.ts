import { generateIndustryWorkspace } from "../generator/datasetGenerator";
import { defaultIndustryId } from "../generator/industryTemplates";
import type { CubeDataset } from "../models/cube";
import type { WorkspaceState } from "../models/operation";

/**
 * Compatibility exports for callers of the former IKEA demo. The default sample
 * now follows the same Furniture & Home Living generator path as every preset.
 */
export const createIkeaDemoWorkspace = (): WorkspaceState =>
  generateIndustryWorkspace({ title: "Sample Sales Analysis", industryId: defaultIndustryId });

export const createIkeaDemoDataset = (): CubeDataset => createIkeaDemoWorkspace().dataset;
