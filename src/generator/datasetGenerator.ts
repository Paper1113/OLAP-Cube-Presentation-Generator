import type { CubeDataset, FactRecord } from "../models/cube";
import type { Dimension } from "../models/dimension";
import type { WorkspaceState } from "../models/operation";
import { orderedLevels } from "../engine/hierarchy";
import { normalizeCubeAppearance, type CubeAppearance } from "../theme/cubeAppearance";
import { getIndustryTemplate, type IndustryTemplate } from "./industryTemplates";
import { generateSalesValue } from "./salesGenerator";

export const generatedWorkspaceDefaultsVersion = 2;

export interface GenerateDatasetOptions {
  title: string;
  industryId: string;
  year?: number;
  random?: () => number;
  appearance?: CubeAppearance;
}

const months = [
  ["jan", "Jan", "q1"], ["feb", "Feb", "q1"], ["mar", "Mar", "q1"],
  ["apr", "Apr", "q2"], ["may", "May", "q2"], ["jun", "Jun", "q2"],
  ["jul", "Jul", "q3"], ["aug", "Aug", "q3"], ["sep", "Sep", "q3"],
  ["oct", "Oct", "q4"], ["nov", "Nov", "q4"], ["dec", "Dec", "q4"],
] as const;

const namespacedId = (prefix: string, industryId: string, id: string): string =>
  `${prefix}-${industryId}-${id}`;

const flattenedProducts = (template: IndustryTemplate) =>
  template.productCategories.flatMap((category) =>
    category.products.map((product) => ({ category, product })),
  );

const flattenedCities = (template: IndustryTemplate) =>
  template.countries.flatMap((country) =>
    country.cities.map((city) => ({ country, city })),
  );

const createDimensions = (template: IndustryTemplate, year: number): Dimension[] => {
  const yearId = `year-${year}`;
  const products = flattenedProducts(template);
  const cities = flattenedCities(template);

  return [
    {
      id: "time",
      name: "Time",
      levels: [
        { id: "time-year", name: "Year", order: 1, members: [{ id: yearId, label: String(year), levelId: "time-year" }] },
        {
          id: "time-quarter",
          name: "Quarter",
          order: 2,
          members: ["Q1", "Q2", "Q3", "Q4"].map((label, index) => ({
            id: `q${index + 1}`,
            label,
            levelId: "time-quarter",
            parentMemberId: yearId,
          })),
        },
        {
          id: "time-month",
          name: "Month",
          order: 3,
          members: months.map(([id, label, quarter]) => ({
            id: `month-${id}`,
            label,
            levelId: "time-month",
            parentMemberId: quarter,
          })),
        },
      ],
    },
    {
      id: "product",
      name: "Product",
      levels: [
        {
          id: "product-category",
          name: "Category",
          order: 1,
          members: template.productCategories.map((category) => ({
            id: namespacedId("category", template.id, category.id),
            label: category.label,
            levelId: "product-category",
          })),
        },
        {
          id: "product-item",
          name: "Product",
          order: 2,
          members: products.map(({ category, product }) => ({
            id: namespacedId("product", template.id, product.id),
            label: product.label,
            levelId: "product-item",
            parentMemberId: namespacedId("category", template.id, category.id),
          })),
        },
      ],
    },
    {
      id: "location",
      name: "Location",
      levels: [
        {
          id: "location-country",
          name: "Country",
          order: 1,
          members: template.countries.map((country) => ({
            id: namespacedId("country", template.id, country.id),
            label: country.label,
            levelId: "location-country",
          })),
        },
        {
          id: "location-city",
          name: "City",
          order: 2,
          members: cities.map(({ country, city }) => ({
            id: namespacedId("city", template.id, city.id),
            label: city.label,
            levelId: "location-city",
            parentMemberId: namespacedId("country", template.id, country.id),
          })),
        },
      ],
    },
  ];
};

const leafMemberIds = (dataset: CubeDataset, dimensionId: string): string[] => {
  const dimension = dataset.dimensions.find((candidate) => candidate.id === dimensionId);
  const level = dimension
    ? [...orderedLevels(dimension)].reverse().find((candidate) => candidate.members.length > 0)
    : undefined;
  return level?.members.map((member) => member.id) ?? [];
};

const indexByMemberId = (dataset: CubeDataset, dimensionId: string): Map<string, number> =>
  new Map(leafMemberIds(dataset, dimensionId).map((memberId, index) => [memberId, index]));

const createFacts = (dataset: CubeDataset, template: IndustryTemplate, random: () => number): FactRecord[] => {
  const monthIds = leafMemberIds(dataset, "time");
  const productIds = leafMemberIds(dataset, "product");
  const cityIds = leafMemberIds(dataset, "location");

  return monthIds.flatMap((time, monthIndex) =>
    productIds.flatMap((product, productIndex) =>
      cityIds.map((location, cityIndex) => ({
        coordinates: { time, product, location },
        measures: {
          sales: generateSalesValue({ industry: template, monthIndex, productIndex, cityIndex }, random),
        },
      })),
    ),
  );
};

/** Generates a complete, presentation-sized workspace and resets all operation IDs. */
export const generateIndustryWorkspace = ({
  title,
  industryId,
  year = new Date().getFullYear(),
  random = Math.random,
  appearance,
}: GenerateDatasetOptions): WorkspaceState => {
  const template = getIndustryTemplate(industryId);
  if (!template) throw new Error(`Unknown industry preset: ${industryId}`);

  const dimensions = createDimensions(template, year);
  const dataset: CubeDataset = {
    title: title.trim() || "Sample Sales Analysis",
    dimensions,
    measures: [{ id: "sales", name: "Sales", aggregation: "sum" }],
    facts: [],
  };
  dataset.facts = createFacts(dataset, template, random);

  const productCategoryIds = dataset.dimensions
    .find((dimension) => dimension.id === "product")
    ?.levels.find((level) => level.id === "product-category")?.members.map((member) => member.id) ?? [];
  const countryIds = dataset.dimensions
    .find((dimension) => dimension.id === "location")
    ?.levels.find((level) => level.id === "location-country")?.members.map((member) => member.id) ?? [];

  return {
    dataset,
    axisMapping: { x: "time", y: "product", z: "location" },
    activeLevels: {
      time: "time-quarter",
      product: "product-category",
      location: "location-country",
    },
    operations: {
      activeOperation: "original",
      slice: { dimensionId: "location", memberId: countryIds[0] ?? "" },
      dice: {
        selections: {
          time: ["q1", "q2"],
          product: productCategoryIds.slice(0, 2),
          location: countryIds.slice(0, 2),
        },
      },
      rollup: { dimensionId: "time", targetLevelId: "time-year" },
      drilldown: { dimensionId: "time", targetLevelId: "time-month" },
    },
    appearance: normalizeCubeAppearance(appearance),
    generation: {
      industryId: template.id,
      selectedIndustryId: template.id,
      generated: true,
      defaultLevelsVersion: generatedWorkspaceDefaultsVersion,
    },
  };
};

/**
 * Migrates generated workspaces saved before all three dimensions became
 * drill-down-ready. Custom datasets and already-migrated workspaces are kept
 * unchanged.
 */
export const migrateGeneratedWorkspaceDefaults = (workspace: WorkspaceState): WorkspaceState => {
  if (
    !workspace.generation?.generated
    || workspace.generation.defaultLevelsVersion === generatedWorkspaceDefaultsVersion
  ) {
    return workspace;
  }

  const productCategories = workspace.dataset.dimensions
    .find((dimension) => dimension.id === "product")
    ?.levels.find((level) => level.id === "product-category")?.members.map((member) => member.id) ?? [];
  const countries = workspace.dataset.dimensions
    .find((dimension) => dimension.id === "location")
    ?.levels.find((level) => level.id === "location-country")?.members.map((member) => member.id) ?? [];

  if (productCategories.length === 0 || countries.length === 0) return workspace;

  return {
    ...workspace,
    activeLevels: {
      ...workspace.activeLevels,
      product: "product-category",
      location: "location-country",
    },
    operations: {
      ...workspace.operations,
      slice: { ...workspace.operations.slice, dimensionId: "location", memberId: countries[0] },
      dice: {
        ...workspace.operations.dice,
        selections: {
          ...workspace.operations.dice.selections,
          product: productCategories.slice(0, 2),
          location: countries.slice(0, 2),
        },
      },
      rollup: { dimensionId: "time", targetLevelId: "time-year" },
      drilldown: { dimensionId: "time", targetLevelId: "time-month" },
    },
    generation: {
      ...workspace.generation,
      defaultLevelsVersion: generatedWorkspaceDefaultsVersion,
    },
  };
};

/** Replaces only Sales values while retaining each existing fact coordinate object. */
export const refreshSalesFacts = (
  dataset: CubeDataset,
  template: IndustryTemplate,
  random: () => number = Math.random,
): CubeDataset => {
  const monthIndexes = indexByMemberId(dataset, "time");
  const productIndexes = indexByMemberId(dataset, "product");
  const cityIndexes = indexByMemberId(dataset, "location");

  return {
    ...dataset,
    facts: dataset.facts.map((fact) => ({
      ...fact,
      coordinates: fact.coordinates,
      measures: {
        ...fact.measures,
        sales: generateSalesValue({
          industry: template,
          monthIndex: monthIndexes.get(fact.coordinates.time) ?? 0,
          productIndex: productIndexes.get(fact.coordinates.product) ?? 0,
          cityIndex: cityIndexes.get(fact.coordinates.location) ?? 0,
        }, random),
      },
    })),
  };
};
