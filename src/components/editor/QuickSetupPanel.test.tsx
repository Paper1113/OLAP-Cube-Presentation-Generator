import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultIndustryId } from "../../generator/industryTemplates";
import { QuickSetupPanel } from "./QuickSetupPanel";

afterEach(() => cleanup());

describe("QuickSetupPanel UI smoke", () => {
  it("exposes title, industry, and generate controls", async () => {
    const user = userEvent.setup();
    const onTitleChange = vi.fn();
    const onIndustryChange = vi.fn();
    const onGenerate = vi.fn();
    const onRefreshSales = vi.fn();

    render(
      <QuickSetupPanel
        title="Sample Sales Analysis"
        selectedIndustryId={defaultIndustryId}
        generated={false}
        canRefreshSales={false}
        onTitleChange={onTitleChange}
        onIndustryChange={onIndustryChange}
        onGenerate={onGenerate}
        onRefreshSales={onRefreshSales}
      />,
    );

    expect(screen.getByRole("heading", { name: "Quick Setup" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Dataset title" })).toHaveValue("Sample Sales Analysis");

    const industry = screen.getByRole("combobox", { name: "Industry" });
    expect(industry).toHaveDisplayValue("Furniture & Home Living");
    expect(within(industry).getByRole("option", { name: "Furniture & Home Living" })).toBeInTheDocument();

    const titleInput = screen.getByRole("textbox", { name: "Dataset title" });
    await user.clear(titleInput);
    await user.type(titleInput, "Retail Demo");
    expect(onTitleChange).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Generate Dataset" }));
    expect(onGenerate).toHaveBeenCalledTimes(1);

    expect(screen.getByRole("button", { name: "↻ Refresh Sales Data" })).toBeDisabled();
  });

  it("enables refresh and regenerate labels after a dataset exists", async () => {
    const user = userEvent.setup();
    const onRefreshSales = vi.fn();

    render(
      <QuickSetupPanel
        title="Sample Sales Analysis"
        selectedIndustryId={defaultIndustryId}
        generated
        canRefreshSales
        onTitleChange={vi.fn()}
        onIndustryChange={vi.fn()}
        onGenerate={vi.fn()}
        onRefreshSales={onRefreshSales}
      />,
    );

    expect(screen.getByRole("button", { name: "Regenerate Dataset" })).toBeInTheDocument();
    const refresh = screen.getByRole("button", { name: "↻ Refresh Sales Data" });
    expect(refresh).toBeEnabled();
    await user.click(refresh);
    expect(onRefreshSales).toHaveBeenCalledTimes(1);
  });
});
