import { expect, it } from "vitest";
import { uniqueErrors } from "./errors";

it("keeps the first occurrence of each validation error", () => {
  expect(uniqueErrors([
    "Add a SUM measure before rendering a cube.",
    "Add a SUM measure before rendering a cube.",
    "Exactly three dimensions are required.",
  ])).toEqual([
    "Add a SUM measure before rendering a cube.",
    "Exactly three dimensions are required.",
  ]);
});
