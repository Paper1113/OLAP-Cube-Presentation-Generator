import type { IndustryTemplate } from "./industryTemplates";

export interface SalesGenerationContext {
  industry: IndustryTemplate;
  monthIndex: number;
  productIndex: number;
  cityIndex: number;
}

const boundedRandom = (random: () => number): number => Math.min(0.999_999_999, Math.max(0, random()));

/** Creates varied, whole-number synthetic sales values for educational examples. */
export const generateSalesValue = (
  { industry, monthIndex, productIndex, cityIndex }: SalesGenerationContext,
  random: () => number = Math.random,
): number => {
  const { minimum, maximum, seasonality } = industry.salesProfile;
  const lower = Math.min(minimum, maximum);
  const upper = Math.max(minimum, maximum);
  const base = (lower + upper) / 2;
  const productMultiplier = 0.86 + (productIndex % 4) * 0.1;
  const cityMultiplier = 0.9 + (cityIndex % 3) * 0.08;
  const seasonalMultiplier = seasonality?.[monthIndex % 12] ?? 1;
  const variationMultiplier = 0.86 + boundedRandom(random) * 0.28;
  const generated = base * productMultiplier * cityMultiplier * seasonalMultiplier * variationMultiplier;

  return Math.round(Math.min(upper, Math.max(lower, generated)));
};
