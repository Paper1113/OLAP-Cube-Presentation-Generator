import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("App UI smoke", () => {
  it("renders the editor shell with Quick Setup and cube preview", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "OLAP Cube Presentation Generator" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quick Setup" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "OLAP operations" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Dataset and operation controls" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Cube preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export SVG" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Export PNG" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Export PowerPoint" })).toBeEnabled();
    expect(screen.getByText("Saved locally")).toBeInTheDocument();
    expect(document.getElementById("main-cube-svg")).not.toBeNull();
  });

  it("switches between Editor and Presentation preview modes", async () => {
    const user = userEvent.setup();
    render(<App />);

    const modeSwitch = screen.getByRole("group", { name: "Application mode" });
    await user.click(within(modeSwitch).getByRole("button", { name: "Presentation preview" }));

    expect(screen.getByRole("heading", { name: "Presentation Preview" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Presentation preview" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Quick Setup" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to editor" }));
    expect(screen.getByRole("heading", { name: "Quick Setup" })).toBeInTheDocument();
  });
});
