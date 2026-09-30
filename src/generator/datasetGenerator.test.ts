import { describe, expect, it } from "vitest";
import { createCubeView } from "../engine/cubeEngine";
import { validateDataset } from "../engine/validation";
import type { CubeDataset } from "../models/cube";
import type { OperationConfig, WorkspaceState } from "../models/operation";
import {
  generateIndustryWorkspace,
  generatedWorkspaceDefaultsVersion,
  migrateGeneratedWorkspaceDefaults,
  refreshSalesFacts,
} from "./datasetGenerator";
import { synchronizeLeafFacts } from "./factSynchronizer";
import { industryTemplates } from "./industryTemplates";

const levelMembers = (dataset: CubeDataset, dimensionId: string, levelId: string) =>
  dataset.dimensions.find((dimension) => dimension.id === dimensionId)?.levels
    .find((level) => level.id === levelId)?.members ?? [];

const operationFor = (workspace: WorkspaceState, type: OperationConfig["type"]): OperationConfig => {
  switch (type) {
    case "slice": return { type, ...workspace.operations.slice };
    case "dice": return { type, ...workspace.operations.dice };
    case "rollup": return { type, ...workspace.operations.rollup };
    case "drilldown": return { type, ...workspace.operations.drilldown };
    default: return { type: "original" };
  }
};

describe("industry templates", () => {
  it("contains exactly ten unique named presets with presentation-sized leaf members", () => {
    expect(industryTemplates).toHaveLength(10);
    expect(industryTemplates.map((template) => template.id)).toEqual([
      "furniture-home",
      "consumer-electronics",
      "fashion-apparel",
      "grocery-supermarket",
      "automotive",
      "food-beverage",
      "hospitality-travel",
      "healthcare-pharmacy",
      "sports-fitness",
      "beauty-personal-care",
    ]);
    expect(new Set(industryTemplates.map((template) => template.id)).size).toBe(10);

    industryTemplates.forEach((template) => {
      expect(template.name.trim()).not.toBe("");
      expect(template.productCategories.flatMap((category) => category.products)).toHaveLength(4);
      expect(template.countries).toHaveLength(2);
      expect(template.countries.flatMap((country) => country.cities)).toHaveLength(3);
    });
  });

  it("keeps the default Furniture sample's Product and Location members aligned", () => {
    const template = industryTemplates[0];

    expect(template.productCategories.flatMap((category) => category.products.map((product) => product.label))).toEqual([
      "Sofa",
      "Armchair",
      "Bed Frame",
      "Bookcase",
    ]);
    expect(template.countries.flatMap((country) => country.cities.map((city) => city.label))).toEqual([
      "Sydney",
      "Perth",
      "Los Angeles",
    ]);
  });

  it("copies the default Product and Location data into the generated dataset", () => {
    const { dataset } = generateIndustryWorkspace({
      title: "Default analysis",
      industryId: "furniture-home",
      year: 2032,
      random: () => 0.3,
    });
    const products = levelMembers(dataset, "product", "product-item");
    const cities = levelMembers(dataset, "location", "location-city");

    expect(products.map((member) => member.label)).toEqual(["Sofa", "Armchair", "Bed Frame", "Bookcase"]);
    expect(cities.map((member) => member.label)).toEqual(["Sydney", "Perth", "Los Angeles"]);
    expect(dataset.facts).toHaveLength(12 * products.length * cities.length);
    expect(dataset.facts.every((fact) => products.some((member) => member.id === fact.coordinates.product))).toBe(true);
    expect(dataset.facts.every((fact) => cities.some((member) => member.id === fact.coordinates.location))).toBe(true);
  });
});

describe("industry workspace generator", () => {
  it.each(industryTemplates.map((template) => [template.id]))(
    "creates a complete hierarchy, facts, and working operations for %s",
    (industryId) => {
      const workspace = generateIndustryWorkspace({
        title: "Generated analysis",
        industryId,
        year: 2032,
        random: () => 0.3,
      });
      const { dataset } = workspace;
      const timeMonths = levelMembers(dataset, "time", "time-month");
      const timeQuarters = levelMembers(dataset, "time", "time-quarter");
      const years = levelMembers(dataset, "time", "time-year");
      const categories = levelMembers(dataset, "product", "product-category");
      const products = levelMembers(dataset, "product", "product-item");
      const countries = levelMembers(dataset, "location", "location-country");
      const cities = levelMembers(dataset, "location", "location-city");

      expect(dataset.dimensions.map((dimension) => dimension.id)).toEqual(["time", "product", "location"]);
      expect(dataset.measures).toEqual([{ id: "sales", name: "Sales", aggregation: "sum" }]);
      expect(years).toHaveLength(1);
      expect(years[0].label).toBe("2032");
      expect(timeQuarters).toHaveLength(4);
      expect(timeMonths).toHaveLength(12);
      expect(products).toHaveLength(4);
      expect(cities).toHaveLength(3);
      expect(dataset.facts).toHaveLength(144);
      expect(workspace.generation).toEqual({
        industryId,
        selectedIndustryId: industryId,
        generated: true,
        defaultLevelsVersion: generatedWorkspaceDefaultsVersion,
      });
      expect(workspace.activeLevels).toEqual({
        time: "time-quarter",
        product: "product-category",
        location: "location-country",
      });
      expect(workspace.operations.rollup).toEqual({
        dimensionId: "time",
        sourceLevelId: "time-quarter",
        targetLevelId: "time-year",
      });
      expect(validateDataset(dataset)).toEqual([]);

      const categoryIds = new Set(categories.map((member) => member.id));
      const countryIds = new Set(countries.map((member) => member.id));
      expect(products.every((member) => member.parentMemberId && categoryIds.has(member.parentMemberId))).toBe(true);
      expect(cities.every((member) => member.parentMemberId && countryIds.has(member.parentMemberId))).toBe(true);

      const monthIds = new Set(timeMonths.map((member) => member.id));
      const productIds = new Set(products.map((member) => member.id));
      const cityIds = new Set(cities.map((member) => member.id));
      const coordinateKeys = new Set(dataset.facts.map((fact) => [
        fact.coordinates.time,
        fact.coordinates.product,
        fact.coordinates.location,
      ].join("\u0000")));
      expect(coordinateKeys.size).toBe(144);
      dataset.facts.forEach((fact) => {
        expect(monthIds.has(fact.coordinates.time)).toBe(true);
        expect(productIds.has(fact.coordinates.product)).toBe(true);
        expect(cityIds.has(fact.coordinates.location)).toBe(true);
        expect(Number.isFinite(fact.measures.sales)).toBe(true);
      });

      (["original", "slice", "dice", "rollup", "drilldown"] as const).forEach((type) => {
        const result = createCubeView(dataset, {
          axisMapping: workspace.axisMapping,
          activeLevels: workspace.activeLevels,
          operation: operationFor(workspace, type),
        });
        expect(result.errors).toEqual([]);
        expect(result.view).not.toBeNull();
      });
    },
  );

  it.each(industryTemplates.map((template) => [template.id]))(
    "supports Drill-down from the default level of every dimension for %s",
    (industryId) => {
      const workspace = generateIndustryWorkspace({
        title: "Drill-down analysis",
        industryId,
        year: 2032,
        random: () => 0.3,
      });

      const transitions = [
        ["time", "time-month", "x"],
        ["product", "product-item", "y"],
        ["location", "location-city", "z"],
      ] as const;

      transitions.forEach(([dimensionId, targetLevelId, axis]) => {
        const result = createCubeView(workspace.dataset, {
          axisMapping: workspace.axisMapping,
          activeLevels: workspace.activeLevels,
          operation: { type: "drilldown", dimensionId, targetLevelId },
        });
        expect(result.errors).toEqual([]);
        expect(result.view?.[axis].levelId).toBe(targetLevelId);
      });
    },
  );

  it.each(industryTemplates.map((template) => [template.id]))(
    "supports Roll-up from the corresponding source level of every dimension for %s",
    (industryId) => {
      const workspace = generateIndustryWorkspace({
        title: "Roll-up analysis",
        industryId,
        year: 2032,
        random: () => 0.3,
      });

      const transitions = [
        ["time", "time-quarter", "time-year", "x"],
        ["product", "product-item", "product-category", "y"],
        ["location", "location-city", "location-country", "z"],
      ] as const;

      transitions.forEach(([dimensionId, sourceLevelId, targetLevelId, axis]) => {
        const result = createCubeView(workspace.dataset, {
          axisMapping: workspace.axisMapping,
          activeLevels: { ...workspace.activeLevels, [dimensionId]: sourceLevelId },
          operation: { type: "rollup", dimensionId, sourceLevelId, targetLevelId },
        });
        expect(result.errors).toEqual([]);
        expect(result.view?.[axis].levelId).toBe(targetLevelId);
      });
    },
  );

  it("migrates generated workspaces saved with the old Product and Location defaults", () => {
    const workspace = generateIndustryWorkspace({
      title: "Legacy analysis",
      industryId: "furniture-home",
      year: 2032,
      random: () => 0.3,
    });
    const legacyWorkspace: WorkspaceState = {
      ...workspace,
      activeLevels: { time: "time-quarter", product: "product-item", location: "location-city" },
      operations: {
        ...workspace.operations,
        slice: { dimensionId: "location", memberId: "city-furniture-home-sydney" },
        dice: {
          ...workspace.operations.dice,
          selections: {
            ...workspace.operations.dice.selections,
            product: ["product-furniture-home-sofa", "product-furniture-home-armchair"],
            location: ["city-furniture-home-sydney", "city-furniture-home-perth"],
          },
        },
        rollup: { dimensionId: "location", targetLevelId: "location-country" },
        drilldown: { dimensionId: "time", targetLevelId: "time-month" },
      },
      generation: { ...workspace.generation, defaultLevelsVersion: undefined },
    };

    const migrated = migrateGeneratedWorkspaceDefaults(legacyWorkspace);

    expect(migrated.activeLevels).toEqual({
      time: "time-quarter",
      product: "product-category",
      location: "location-country",
    });
    expect(migrated.generation?.defaultLevelsVersion).toBe(generatedWorkspaceDefaultsVersion);
    expect(migrated.operations.slice.memberId).toBe("country-furniture-home-australia");
    expect(migrated.operations.dice.selections.product).toEqual([
      "category-furniture-home-living-room",
      "category-furniture-home-bedroom",
    ]);
    expect(migrated.operations.dice.selections.location).toEqual([
      "country-furniture-home-australia",
      "country-furniture-home-united-states",
    ]);
    expect(migrated.operations.rollup).toEqual({
      dimensionId: "time",
      sourceLevelId: "time-quarter",
      targetLevelId: "time-year",
    });
  });

  it("does not migrate a generated workspace with customized operation settings", () => {
    const workspace = generateIndustryWorkspace({
      title: "Customized legacy analysis",
      industryId: "furniture-home",
      year: 2032,
      random: () => 0.3,
    });
    const customizedWorkspace: WorkspaceState = {
      ...workspace,
      activeLevels: { time: "time-quarter", product: "product-item", location: "location-city" },
      operations: {
        ...workspace.operations,
        slice: { dimensionId: "location", memberId: "city-furniture-home-perth" },
        dice: {
          ...workspace.operations.dice,
          selections: {
            ...workspace.operations.dice.selections,
            product: ["product-furniture-home-sofa", "product-furniture-home-armchair"],
            location: ["city-furniture-home-sydney", "city-furniture-home-perth"],
          },
        },
        rollup: { dimensionId: "location", targetLevelId: "location-country" },
        drilldown: { dimensionId: "time", targetLevelId: "time-month" },
      },
      generation: { ...workspace.generation, defaultLevelsVersion: undefined },
    };

    const migrated = migrateGeneratedWorkspaceDefaults(customizedWorkspace);

    expect(migrated).toBe(customizedWorkspace);
    expect(migrated.activeLevels).toEqual({ time: "time-quarter", product: "product-item", location: "location-city" });
    expect(migrated.operations.slice.memberId).toBe("city-furniture-home-perth");
    expect(migrated.generation?.defaultLevelsVersion).toBeUndefined();
  });

  it("refreshes only Sales values while retaining each coordinate object", () => {
    const workspace = generateIndustryWorkspace({
      title: "Fashion analysis",
      industryId: "fashion-apparel",
      year: 2032,
      random: () => 0.1,
    });
    const template = industryTemplates.find((candidate) => candidate.id === "fashion-apparel")!;
    const originalCoordinates = workspace.dataset.facts.map((fact) => fact.coordinates);
    const originalSales = workspace.dataset.facts.map((fact) => fact.measures.sales);
    const refreshed = refreshSalesFacts(workspace.dataset, template, () => 0.9);

    expect(refreshed.title).toBe("Fashion analysis");
    expect(refreshed.facts).toHaveLength(144);
    refreshed.facts.forEach((fact, index) => {
      expect(fact.coordinates).toBe(originalCoordinates[index]);
      expect(fact.measures.sales).not.toBe(originalSales[index]);
    });
  });

  it("synchronizes advanced hierarchy edits to one complete, de-duplicated leaf grid", () => {
    const workspace = generateIndustryWorkspace({
      title: "Furniture analysis",
      industryId: "furniture-home",
      year: 2032,
      random: () => 0.4,
    });
    const original = workspace.dataset;
    const keptFact = original.facts[0];
    const datasetWithRemovedProduct = {
      ...original,
      dimensions: original.dimensions.map((dimension) => dimension.id !== "product" ? dimension : {
        ...dimension,
        levels: dimension.levels.map((level) => level.id !== "product-item" ? level : {
          ...level,
          members: level.members.slice(0, 3),
        }),
      }),
      facts: [...original.facts, original.facts[0]],
    };
    const synchronized = synchronizeLeafFacts(datasetWithRemovedProduct, () => 0);
    const coordinateKeys = new Set(synchronized.facts.map((fact) => [
      fact.coordinates.time,
      fact.coordinates.product,
      fact.coordinates.location,
    ].join("\u0000")));

    expect(synchronized.facts).toHaveLength(12 * 3 * 3);
    expect(coordinateKeys.size).toBe(12 * 3 * 3);
    expect(synchronized.facts.find((fact) => fact.coordinates === keptFact.coordinates)).toBe(keptFact);
    expect(synchronized.facts.some((fact) => fact.coordinates.product.includes("bookcase"))).toBe(false);
  });
});
