import type { CubeDataset } from "../models/cube";
import type { WorkspaceState } from "../models/operation";

const monthDefinitions = [
  ["jan", "Jan", "q1"], ["feb", "Feb", "q1"], ["mar", "Mar", "q1"],
  ["apr", "Apr", "q2"], ["may", "May", "q2"], ["jun", "Jun", "q2"],
  ["jul", "Jul", "q3"], ["aug", "Aug", "q3"], ["sep", "Sep", "q3"],
  ["oct", "Oct", "q4"], ["nov", "Nov", "q4"], ["dec", "Dec", "q4"],
] as const;

const products = [
  ["sofa", "Sofa", "living-room"],
  ["armchair", "Armchair", "living-room"],
  ["bookcase", "Bookcase", "storage"],
  ["bed-frame", "Bed Frame", "bedroom"],
] as const;

const locations = [
  ["perth", "Perth", "australia"],
  ["sydney", "Sydney", "australia"],
  ["los-angeles", "Los Angeles", "usa"],
] as const;

const perthSofaMonthlySales = [460, 475, 491, 500, 501, 510, 470, 475, 480, 480, 490, 503];

export const createIkeaDemoDataset = (): CubeDataset => ({
  title: "IKEA Sales Analysis",
  dimensions: [
    {
      id: "time",
      name: "Time",
      levels: [
        { id: "time-year", name: "Year", order: 1, members: [{ id: "year-2026", label: "2026", levelId: "time-year" }] },
        {
          id: "time-quarter", name: "Quarter", order: 2,
          members: ["Q1", "Q2", "Q3", "Q4"].map((label, index) => ({
            id: `q${index + 1}`,
            label,
            levelId: "time-quarter",
            parentMemberId: "year-2026",
          })),
        },
        {
          id: "time-month", name: "Month", order: 3,
          members: monthDefinitions.map(([id, label, quarter]) => ({
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
          id: "product-category", name: "Category", order: 1,
          members: [
            { id: "living-room", label: "Living Room", levelId: "product-category" },
            { id: "storage", label: "Storage", levelId: "product-category" },
            { id: "bedroom", label: "Bedroom", levelId: "product-category" },
          ],
        },
        {
          id: "product-item", name: "Product", order: 2,
          members: products.map(([id, label, parent]) => ({
            id: `product-${id}`,
            label,
            levelId: "product-item",
            parentMemberId: parent,
          })),
        },
      ],
    },
    {
      id: "location",
      name: "Location",
      levels: [
        {
          id: "location-country", name: "Country", order: 1,
          members: [
            { id: "australia", label: "Australia", levelId: "location-country" },
            { id: "usa", label: "USA", levelId: "location-country" },
          ],
        },
        {
          id: "location-city", name: "City", order: 2,
          members: locations.map(([id, label, parent]) => ({
            id: `location-${id}`,
            label,
            levelId: "location-city",
            parentMemberId: parent,
          })),
        },
      ],
    },
  ],
  measures: [{ id: "sales", name: "Sales", aggregation: "sum" }],
  facts: monthDefinitions.flatMap(([monthId], monthIndex) =>
    products.flatMap(([productId], productIndex) =>
      locations.map(([locationId], locationIndex) => ({
        coordinates: {
          time: `month-${monthId}`,
          product: `product-${productId}`,
          location: `location-${locationId}`,
        },
        measures: {
          sales: productId === "sofa" && locationId === "perth"
            ? perthSofaMonthlySales[monthIndex]
            : 900 + productIndex * 165 + locationIndex * 95 + monthIndex * 23 + (monthIndex % 3) * 13,
        },
      })),
    ),
  ),
});

export const createIkeaDemoWorkspace = (): WorkspaceState => ({
  dataset: createIkeaDemoDataset(),
  axisMapping: { x: "time", y: "product", z: "location" },
  activeLevels: {
    time: "time-quarter",
    product: "product-item",
    location: "location-city",
  },
  operations: {
    activeOperation: "original",
    slice: { dimensionId: "location", memberId: "location-perth" },
    dice: {
      selections: {
        time: ["q1", "q2"],
        product: ["product-sofa", "product-bookcase"],
        location: ["location-perth", "location-sydney"],
      },
    },
    rollup: { dimensionId: "location", targetLevelId: "location-country" },
    drilldown: { dimensionId: "time", targetLevelId: "time-month" },
  },
});
