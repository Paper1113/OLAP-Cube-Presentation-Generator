import { useEffect, useMemo, useState } from "react";
import { CubeRenderer } from "./components/cube/CubeRenderer";
import { DatasetEditor } from "./components/editor/DatasetEditor";
import { DimensionEditor } from "./components/editor/DimensionEditor";
import { FactGrid } from "./components/editor/FactGrid";
import { OperationTabs } from "./components/operations/OperationTabs";
import { PresentationPreview } from "./components/presentation/PresentationPreview";
import { createIkeaDemoWorkspace } from "./demo/ikeaDemo";
import { createCubeView } from "./engine/cubeEngine";
import { validateDataset } from "./engine/validation";
import { downloadPng } from "./export/pngExport";
import { exportPresentation } from "./export/pptxExport";
import { downloadSvg } from "./export/svgExport";
import type { OperationConfig, WorkspaceState } from "./models/operation";
import { clearWorkspace, loadWorkspace, saveWorkspace } from "./utils/storage";

type AppMode = "editor" | "presentation";

const operationConfigFor = (workspace: WorkspaceState): OperationConfig => {
  const { operations } = workspace;
  switch (operations.activeOperation) {
    case "slice":
      return { type: "slice", ...operations.slice };
    case "dice":
      return { type: "dice", ...operations.dice };
    case "rollup":
      return { type: "rollup", ...operations.rollup };
    case "drilldown":
      return { type: "drilldown", ...operations.drilldown };
    default:
      return { type: "original" };
  }
};

const safeFilename = (value: string): string =>
  (value.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "") || "olap-cube");

const hasUsableDataset = (candidate: WorkspaceState | null): candidate is WorkspaceState =>
  Boolean(
    candidate
      && candidate.dataset
      && Array.isArray(candidate.dataset.dimensions)
      && candidate.dataset.dimensions.length === 3
      && Array.isArray(candidate.dataset.facts),
  );

const activeSvgElement = (): SVGSVGElement | null => {
  const element = document.getElementById("main-cube-svg");
  return element instanceof SVGSVGElement ? element : null;
};

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => {
    const stored = loadWorkspace();
    return hasUsableDataset(stored) ? stored : createIkeaDemoWorkspace();
  });
  const [mode, setMode] = useState<AppMode>("editor");
  const [exportStatus, setExportStatus] = useState("");

  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);

  const operation = useMemo(() => operationConfigFor(workspace), [workspace]);
  const cubeResult = useMemo(
    () => createCubeView(workspace.dataset, {
      axisMapping: workspace.axisMapping,
      activeLevels: workspace.activeLevels,
      operation,
    }),
    [workspace, operation],
  );
  const validationErrors = useMemo(() => validateDataset(workspace.dataset), [workspace.dataset]);
  const visibleErrors = [...validationErrors, ...cubeResult.errors];
  const filenameBase = safeFilename(`${workspace.dataset.title}-${operation.type}`);

  const handleSvgExport = () => {
    const svg = activeSvgElement();
    if (!svg) {
      setExportStatus("The current cube is unavailable for export.");
      return;
    }
    downloadSvg(svg, `${filenameBase}.svg`);
    setExportStatus("SVG download started.");
  };

  const handlePngExport = async () => {
    const svg = activeSvgElement();
    if (!svg) {
      setExportStatus("The current cube is unavailable for export.");
      return;
    }
    setExportStatus("Preparing a 3× PNG export…");
    try {
      await downloadPng(svg, `${filenameBase}.png`, { scale: 3 });
      setExportStatus("PNG download started.");
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "PNG export failed.");
    }
  };

  const handlePptxExport = async () => {
    if (validationErrors.length > 0) {
      setExportStatus("Fix dataset validation errors before creating a PowerPoint file.");
      return;
    }
    setExportStatus("Creating the six-slide PowerPoint presentation…");
    try {
      await exportPresentation({
        dataset: workspace.dataset,
        axisMapping: workspace.axisMapping,
        activeLevels: workspace.activeLevels,
        operations: workspace.operations,
        filename: `${safeFilename(workspace.dataset.title)}-olap-analysis.pptx`,
      });
      setExportStatus("PowerPoint download started.");
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "PowerPoint export failed.");
    }
  };

  const loadDemo = () => {
    setWorkspace(createIkeaDemoWorkspace());
    setExportStatus("The IKEA demo dataset is loaded.");
  };

  const resetDataset = () => {
    clearWorkspace();
    setWorkspace(createIkeaDemoWorkspace());
    setExportStatus("The dataset was reset to the built-in demo.");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>OLAP Cube Presentation Generator</h1>
          <p>Build hierarchy-aware data cubes and presentation-ready diagrams in your browser.</p>
        </div>
        <div className="mode-switch" role="group" aria-label="Application mode">
          <button type="button" className={mode === "editor" ? "active" : ""} onClick={() => setMode("editor")}>Editor</button>
          <button type="button" className={mode === "presentation" ? "active" : ""} onClick={() => setMode("presentation")}>Presentation preview</button>
        </div>
      </header>

      {mode === "editor" ? (
        <main className="editor-layout">
          <aside className="editor-sidebar" aria-label="Dataset and operation controls">
            <DatasetEditor
              dataset={workspace.dataset}
              axisMapping={workspace.axisMapping}
              onDatasetChange={(dataset) => setWorkspace((current) => ({ ...current, dataset }))}
              onAxisMappingChange={(axisMapping) => setWorkspace((current) => ({ ...current, axisMapping }))}
            />
            <DimensionEditor
              dataset={workspace.dataset}
              activeLevels={workspace.activeLevels}
              onDatasetChange={(dataset) => setWorkspace((current) => ({ ...current, dataset }))}
              onActiveLevelsChange={(activeLevels) => setWorkspace((current) => ({ ...current, activeLevels }))}
            />
            <FactGrid
              dataset={workspace.dataset}
              onDatasetChange={(dataset) => setWorkspace((current) => ({ ...current, dataset }))}
            />
            <OperationTabs
              dataset={workspace.dataset}
              activeLevels={workspace.activeLevels}
              operations={workspace.operations}
              onOperationsChange={(operations) => setWorkspace((current) => ({ ...current, operations }))}
            />
            <div className="dataset-actions">
              <button type="button" className="secondary-button" onClick={loadDemo}>Load demo dataset</button>
              <button type="button" className="text-button danger-button" onClick={resetDataset}>Reset dataset</button>
            </div>
          </aside>

          <section className="preview-area" aria-label="Cube preview">
            {visibleErrors.length > 0 && (
              <section className="validation-panel" aria-live="polite">
                <h3>Resolve these data issues before exporting</h3>
                <ul>{visibleErrors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
              </section>
            )}
            <section className="preview-card">
              <div className="preview-card__header">
                <div>
                  <h2>{cubeResult.view?.operationLabel ?? "Cube preview"}</h2>
                  <p>{workspace.dataset.title} · {workspace.dataset.measures[0]?.name ?? "Measure"} (SUM)</p>
                </div>
                <span className="preview-badge">SVG</span>
              </div>
              {cubeResult.view ? (
                <CubeRenderer view={cubeResult.view} svgId="main-cube-svg" />
              ) : (
                <div className="empty-preview"><p>Correct the data or operation settings to render the cube.</p></div>
              )}
              {cubeResult.view && <p className="preview-description">{cubeResult.view.description}</p>}
            </section>
            <div className="preview-actions">
              <button type="button" className="secondary-button" onClick={handleSvgExport} disabled={!cubeResult.view}>Export SVG</button>
              <button type="button" className="secondary-button" onClick={() => void handlePngExport()} disabled={!cubeResult.view}>Export PNG</button>
              <button type="button" className="primary-button" onClick={() => void handlePptxExport()} disabled={validationErrors.length > 0}>Export PowerPoint</button>
              <button type="button" className="secondary-button" onClick={() => setMode("presentation")}>Open presentation preview</button>
            </div>
            <p className="export-status" role="status">{exportStatus}</p>
          </section>
        </main>
      ) : (
        <main className="presentation-area">
          <PresentationPreview
            dataset={workspace.dataset}
            axisMapping={workspace.axisMapping}
            activeLevels={workspace.activeLevels}
            operations={workspace.operations}
            onClose={() => setMode("editor")}
          />
        </main>
      )}
    </div>
  );
}
