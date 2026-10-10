import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { generateIndustryWorkspace } from "../../generator/datasetGenerator";
import type { OperationSettings } from "../../models/operation";
import { OperationTabs } from "./OperationTabs";

afterEach(() => cleanup());

const sampleWorkspace = generateIndustryWorkspace({
  title: "UI Smoke Workspace",
  industryId: "furniture-home",
});

const Harness = () => {
  const [operations, setOperations] = useState<OperationSettings>(sampleWorkspace.operations);

  return (
    <OperationTabs
      dataset={sampleWorkspace.dataset}
      activeLevels={sampleWorkspace.activeLevels}
      operations={operations}
      onOperationsChange={setOperations}
    />
  );
};

describe("OperationTabs UI smoke", () => {
  it("starts on Original and switches to Slice, Dice, Roll-up, and Drill-down panels", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole("heading", { name: "OLAP operations" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "OLAP operations" })).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "Original" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Original OLAP Cube" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Slice" }));
    expect(screen.getByRole("tab", { name: "Slice" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Slice selection" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Dimension" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Dice" }));
    expect(screen.getByRole("tab", { name: "Dice" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Dice selections" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Roll-up" }));
    expect(screen.getByRole("heading", { name: "Roll-up aggregation" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Drill-down" }));
    expect(screen.getByRole("heading", { name: "Drill-down expansion" })).toBeInTheDocument();
  });
});
