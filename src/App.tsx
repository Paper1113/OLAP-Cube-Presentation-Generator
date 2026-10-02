import { CubeDataTable } from "./components/cube/CubeDataTable";
import { useEffect, useMemo, useState } from "react";
import { CubeRenderer } from "./components/cube/CubeRenderer";
import { AdvancedSettings } from "./components/editor/AdvancedSettings";
import { CubeAppearancePanel } from "./components/editor/CubeAppearancePanel";
import { QuickSetupPanel } from "./components/editor/QuickSetupPanel";
import { OperationTabs } from "./components/operations/OperationTabs";
import { PresentationPreview } from "./components/presentation/PresentationPreview";
import { createCubeView } from "./engine/cubeEngine";
import { validateDataset } from "./engine/validation";
import { downloadPng } from "./export/pngExport";
import { validatePresentation } from "./export/presentationModel";
import { downloadSvg } from "./export/svgExport";
import {
  generateIndustryWorkspace,
  migrateGeneratedWorkspaceDefaults,
  refreshSalesFacts,
} from "./generator/datasetGenerator";
import { synchronizeLeafFacts } from "./generator/factSynchronizer";
import { defaultIndustryId, getIndustryTemplate } from "./generator/industryTemplates";
import type { OperationConfig, WorkspaceState } from "./models/operation";
import {
  DEFAULT_CUBE_APPEARANCE,
  normalizeCubeAppearance,
  type CubeAppearance,
} from "./theme/cubeAppearance";
import { clearWorkspace, loadWorkspace, saveWorkspace } from "./utils/storage";
import { uniqueErrors } from "./utils/errors";

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

const createDefaultWorkspace = (appearance: CubeAppearance = DEFAULT_CUBE_APPEARANCE): WorkspaceState =>
  generateIndustryWorkspace({ title: "Sample Sales Analysis", industryId: defaultIndustryId, appearance });

const selectedIndustryFor = (workspace: WorkspaceState): string => {
  const candidate = workspace.generation?.selectedIndustryId ?? workspace.generation?.industryId;
  return getIndustryTemplate(candidate ?? "")?.id ?? defaultIndustryId;
};

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => {
    const stored = loadWorkspace();
    return hasUsableDataset(stored)
      ? migrateGeneratedWorkspaceDefaults(stored)
      : createDefaultWorkspace();
  });
  const [mode, setMode] = useState<AppMode>("editor");
  const [exportStatus, setExportStatus] = useState("");

  const [pptxBusy, setPptxBusy] = useState(false);
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    setSaved(saveWorkspace(workspace));
  }, [workspace]);

  const operation = useMemo(() => operationConfigFor(workspace), [workspace.operations]);
  const cubeResult = useMemo(
    () => createCubeView(workspace.dataset, {
      axisMapping: workspace.axisMapping,
      activeLevels: workspace.activeLevels,
      operation,
    }),
    [workspace.dataset, workspace.axisMapping, workspace.activeLevels, operation],
  );
  const presentationIssues = useMemo(() => validatePresentation(workspace),
    [workspace.dataset, workspace.axisMapping, workspace.activeLevels, workspace.operations]);
  const goToRepair = (kind: OperationConfig["type"]) => {
    setMode("editor");
    setWorkspace(current => ({...current, operations:{...current.operations, activeOperation:kind}}));
    requestAnimationFrame(() => {
      if (kind === "original") {
        document.querySelectorAll<HTMLDetailsElement>(".advanced-settings, .dimension-editor").forEach(el => el.open = true);
        document.getElementById("dimensions-heading")?.scrollIntoView({block:"center"});
      } else document.getElementById(`operation-tab-${kind}`)?.focus();
    });
  };
  const validationErrors = useMemo(() => validateDataset(workspace.dataset), [workspace.dataset]);
  const visibleErrors = uniqueErrors([...validationErrors, ...cubeResult.errors]);
  const filenameBase = safeFilename(`${workspace.dataset.title}-${operation.type}`);
  const selectedIndustryId = selectedIndustryFor(workspace);
  const generatedTemplate = getIndustryTemplate(workspace.generation?.industryId ?? "");
  const appearance = useMemo(() => normalizeCubeAppearance(workspace.appearance), [workspace.appearance]);

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
    if (pptxBusy) return;
    if (cubeResult.errors.length > 0) {
      setExportStatus(`PowerPoint blocked: ${cubeResult.errors.join(" ")}`);
      return;
    }
    // The exporter performs complete, fresh engine/SUM validation once.
    if (presentationIssues.length > 0) {
      setExportStatus(`PowerPoint blocked: ${presentationIssues.map(issue => `${issue.title}: ${issue.errors.join(" ")}`).join("\n")}`);
      return;
    }
    setPptxBusy(true);
    setExportStatus("Creating the six-slide PowerPoint presentation…");
    try {
      const { exportPresentation } = await import("./export/pptxExport");
      await exportPresentation({
        dataset: workspace.dataset,
        axisMapping: workspace.axisMapping,
        activeLevels: workspace.activeLevels,
        operations: workspace.operations,
        appearance,
        filename: `${safeFilename(workspace.dataset.title)}-olap-analysis.pptx`,
      });
      setExportStatus("PowerPoint download started.");
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "PowerPoint export failed.");
    } finally { setPptxBusy(false); }
  };

  const updateDatasetTitle = (title: string) => {
    setWorkspace((current) => ({
      ...current,
      dataset: { ...current.dataset, title },
    }));
  };

  const selectIndustry = (industryId: string) => {
    setWorkspace((current) => ({
      ...current,
      generation: { ...current.generation, selectedIndustryId: industryId },
    }));
  };

  const generateDataset = () => {
    setWorkspace((current) => generateIndustryWorkspace({
      title: current.dataset.title,
      industryId: selectedIndustryFor(current),
      appearance: normalizeCubeAppearance(current.appearance),
    }));
    setExportStatus("A new industry dataset was generated with default OLAP settings.");
  };

  const refreshSalesData = () => {
    if (!generatedTemplate) {
      setExportStatus("Generate an industry dataset before refreshing its Sales values.");
      return;
    }
    setWorkspace((current) => ({
      ...current,
      dataset: refreshSalesFacts(current.dataset, generatedTemplate),
    }));
    setExportStatus("Sales values were refreshed. Hierarchies, coordinates, and OLAP settings were preserved.");
  };

  const synchronizeFacts = () => {
    try {
      const dataset = synchronizeLeafFacts(workspace.dataset);
      setWorkspace({ ...workspace, dataset });
      setExportStatus(`Facts successfully rebuilt. ${validatePresentation({...workspace, dataset}).length} affected operations still need repair. Original cube levels and operation selections were preserved. Leaf facts rebuilt. Existing Sales and duplicate rows were preserved; only new coordinates received synthetic Sales. Removed coordinates were dropped. Review the repair links above.`);
    } catch (error) {
      setExportStatus(`Facts were preserved. ${error instanceof Error ? error.message : "Complete the hierarchy before rebuilding."}`);
    }
  };

  const loadDemo = () => {
    setWorkspace((current) => createDefaultWorkspace(normalizeCubeAppearance(current.appearance)));
    setExportStatus("The Furniture & Home Living sample is loaded.");
  };

  const resetDataset = () => {
    clearWorkspace();
    setWorkspace(createDefaultWorkspace());
    setExportStatus("The dataset was reset to the built-in Furniture & Home Living sample.");
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

      <p role="status" className={saved ? "storage-status" : "validation-panel"}>{saved ? "Saved locally" : "Not saved: browser storage is blocked or full. Keep this tab open; your changes may be lost on reload."}</p>
      {mode === "editor" ? (
        <main className="editor-layout">
          <aside className="editor-sidebar" aria-label="Dataset and operation controls">
            <QuickSetupPanel
              title={workspace.dataset.title}
              selectedIndustryId={selectedIndustryId}
              generated={Boolean(workspace.generation?.generated)}
              canRefreshSales={Boolean(generatedTemplate)}
              onTitleChange={updateDatasetTitle}
              onIndustryChange={selectIndustry}
              onGenerate={generateDataset}
              onRefreshSales={refreshSalesData}
            />
            <CubeAppearancePanel
              appearance={appearance}
              onChange={(nextAppearance) => setWorkspace((current) => ({ ...current, appearance: nextAppearance }))}
            />
            <OperationTabs
              dataset={workspace.dataset}
              activeLevels={workspace.activeLevels}
              operations={workspace.operations}
              onOperationsChange={(operations) => setWorkspace((current) => ({ ...current, operations }))}
            />
            <AdvancedSettings
              dataset={workspace.dataset}
              axisMapping={workspace.axisMapping}
              activeLevels={workspace.activeLevels}
              onDatasetChange={(dataset) => setWorkspace((current) => ({ ...current, dataset }))}
              onAxisMappingChange={(axisMapping) => setWorkspace((current) => ({ ...current, axisMapping }))}
              onActiveLevelsChange={(activeLevels) => setWorkspace((current) => ({ ...current, activeLevels }))}
              onSynchronizeFacts={synchronizeFacts}
              onRefreshSales={refreshSalesData}
              onLoadSample={loadDemo}
              onReset={resetDataset}
            />
          </aside>

          <section className="preview-area" aria-label="Cube preview">
            {visibleErrors.length > 0 && (
              <section className="validation-panel" aria-live="polite">
                <h3>Resolve these data issues before exporting</h3>
                <ul>{visibleErrors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
              </section>
            )}
            {presentationIssues.length > 0 && <section className="validation-panel" aria-live="polite">
              <h3>{presentationIssues.length} operations need repair before PowerPoint export</h3>
              {presentationIssues.map(issue => <div key={issue.kind}><button type="button" onClick={() => goToRepair(issue.kind)}>Repair {issue.title}</button><p>{issue.errors.join(" ")}</p></div>)}
              <button type="button" onClick={() => goToRepair("original")}>Review Original cube levels</button>
            </section>}
            <section className="preview-card">
              <div className="preview-card__header">
                <div>
                  <h2>{cubeResult.view?.operationLabel ?? "Cube preview"}</h2>
                  <p>{workspace.dataset.title} · {workspace.dataset.measures[0]?.name ?? "Measure"} (SUM)</p>
                </div>
                <span className="preview-badge">SVG</span>
              </div>
              {cubeResult.view ? (
                <CubeRenderer view={cubeResult.view} appearance={appearance} svgId="main-cube-svg" />
              ) : (
                <div className="empty-preview"><p>Correct the data or operation settings to render the cube.</p></div>
              )}
              {cubeResult.view && <>
                {cubeResult.view.cells.length >= 1000 && <p role="status">{cubeResult.view.cells.length.toLocaleString()} cells. Use Roll-up or Dice to reduce rendering cost.</p>}
                <CubeDataTable view={cubeResult.view} />
              </>}
              {cubeResult.view && <p className="preview-description">{cubeResult.view.description}</p>}
            </section>
            <div className="preview-actions">
              <button type="button" className="secondary-button" onClick={handleSvgExport} disabled={!cubeResult.view}>Export SVG</button>
              <button type="button" className="secondary-button" onClick={() => void handlePngExport()} disabled={!cubeResult.view}>Export PNG</button>
              <button type="button" className="primary-button" onClick={() => void handlePptxExport()} disabled={pptxBusy || presentationIssues.length > 0 || cubeResult.errors.length > 0}>{pptxBusy ? "Creating PowerPoint…" : "Export PowerPoint"}</button>
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
            appearance={appearance}
            onClose={() => setMode("editor")}
          />
        </main>
      )}
    </div>
  );
}
