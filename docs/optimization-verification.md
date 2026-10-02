# OLAP precision, repair and rendering verification — 2026-10-02

## Baseline and scope

Initial checkout: `codex/olap-review-fixes`, HEAD `9c548aa`. Only `.workflow/` was untracked; it was preserved and excluded from this change. No applicable AGENTS.md was found in the checkout or parent chain. Baseline: 105 tests and TypeScript/production build passed.

Live main subsequently verified at `cc2010a`. Its existing distinction between lowest-level Drill-down and missing lower-level data was retained. No deployment or merge is authorized.

## Changes and reasons

- Ordinary values keep grouping and up to two decimal places. Nonzero magnitudes below .01 use four significant digits; below 1e-4 or near/above 1e9 use four significant digits in scientific notation. Values that do not fit the cell switch to scientific notation and scale the text, never numeric ellipsis. Zero and missing facts remain distinct (`0` / `—`). SVG titles retain round-trip numeric values and member IDs; a lazily mounted table provides member labels, dimension names and full values, including obscured cells. SUM and facts are unchanged.
- Explicit removed active levels display a disabled “請重新選擇層級 / Select a level again” placeholder without changing state. Slice/Dice/Drill-down no longer fall back visually to a leaf when a requested active level has been deleted. Dice identifies stale selections. Repair links switch to the operation or expand Original hierarchy controls. Rebuild reports facts success separately from the number of affected operations; selections remain unchanged. Existing duplicate/Sales preservation and coarse-fact safeguards are retained.
- Engine request preparation is shared by full cube creation and presentation preflight. Preflight checks hierarchy, selections and fact representability without aggregation or Cartesian cube cells. Export still builds and validates every operation, including SUM overflow, and exports all six slides or refuses the entire presentation. Busy state prevents duplicate export requests.
- Aggregation memo dependencies exclude appearance and pending industry. CubeRenderer memoizes markup. Canvas measurement reuses its context. Spatial buckets index face envelopes; painter-order filtering and the original SAT polygon overlap test still determine occlusion. Large cube and leaf-product hints suggest Roll-up/Dice or reducing members, without truncating data. Full-value table rows are mounted only when opened.
- Cover title uses shared width measurement and at most two explicit lines, with Latin word-boundary preference and CJK character wrapping. Extreme titles have an explicit ellipsis and complete speaker notes. Responsive SVG title preview uses exactly the same visible lines as PPTX.
- Top faces still do not duplicate values; hidden values remain available through titles/table and Slice/Dice.

## Performance

macOS 27.0.1, arm64, Node 26.10.0, Vitest 3.2.7, Node environment (conservative text-width fallback). Same n×n×n synthetic view, fixed 1234.56 values, one warm-up then five measured generations per case. Times below are medians in milliseconds; measurement includes complete SVG generation and intentionally bypasses React memoization. No timing assertions are added to regular tests.

| Cells | Before median | After median | Improvement |
| ---: | ---: | ---: | ---: |
| 125 | 6.11 | 0.96 | 6.4× |
| 1,000 | 82.06 | 7.36 | 11.1× |
| 3,375 | 513.19 | 27.93 | 18.4× |
| 8,000 | 2,026.66 | 78.06 | 26.0× |

Before measured runs: 125: 5.38–6.87; 1000: 81.22–83.43; 3375: 510.52–518.74; 8000: 2014.94–2039.50 ms. After measured runs: 125: .76–1.21; 1000: 6.22–8.05; 3375: 27.75–31.98; 8000: 75.58–84.85 ms. Baseline harness originally ran at module collection and Vitest reported no test suite after printing timings; final harness runs as a normal passing test. The measured generation loop is unchanged.

Reproduce: `npx vitest run --config scripts/benchmark.config.ts`. This synthetic comparison does not establish an unlimited cell count or browser memory limit.

## Automated checks

127 tests passed (105 existing + 22 precision/preflight/title regressions). Production build passed. `git diff --check` passed. Existing occlusion, collision, SVG bounds, removed-level rejection, duplicate facts, mixed-grain rejection and finite SUM checks continue to pass. New checks cover tiny positive/negative values, zero, scientific transitions, rounding across boundaries, full SVG values, invalid offscreen Dice/Drill-down, preserved rebuild selections and final SUM overflow rejection.

## Browser checks

Independent origin `http://127.0.0.1:5179/` preserves the user's other-origin localStorage. Tested Furniture & Home Living and Consumer Electronics. All five operations rendered with generated defaults. Deleting Quarter left an explicit invalid-level placeholder; Rebuild succeeded with five affected operations and preserved invalid settings until an explicit selection. Selecting Year restored Original and exposed remaining Dice/Roll-up errors. A cleared Dice Time selection blocked PowerPoint even while Original rendered; repair link selected Dice and explicit Select all restored export availability.

Entered .004 and -.004 in leaf facts. Positive .004 was visible; negative .004 remained available in its coordinate title/table when occluded. Classic, Minimal, Handwritten and Bold were exercised. DOM bounds of actual visible value text: no values outside SVG, no value-to-value overlap in any of the four styles (72 visible labels in a 288-cell leaf cube). Narrow viewport 390×844: document width 390, no page horizontal overflow. Long mixed Chinese/English title shows two shared visible lines after the final preview adjustment. Browser preview styling is still an approximation of the slide, rather than a PowerPoint emulator.

## Downloads and visual limits

Actual files written to Downloads, independently inspected:

- SVG: 50,334 bytes; standalone browser opening checked separately.
- PNG: 319,233 bytes, 4,254×1,422 pixels, 861 distinct colors. Visually nonblank with complete title, axis labels and numbers; no clipping observed.
- Furniture PPTX: 392,353 bytes, six slide XML parts, five embedded SVG images, ZIP CRC clean. Embedded SVG contains numeric value text and full-value titles.
- Mixed-title Consumer Electronics PPTX: downloaded separately; six slides, complete cover title retained in notes. Compatible renderer shows the two-line cover without overlap with title or credit.

The bundled Artifact Tool importer rendered all six pages. Cover, explanations and page numbers were inspected. That renderer omits the stroke/paint-order SVG numeric text and substitutes some arrow glyphs, so its cube images cannot certify faithful PowerPoint rendering. Keynote is installed but its first-run dialog requires accepting a software license agreement; this was not accepted. Native Keynote/PowerPoint visual verification remains unverified. Structural checks and browser downloads do not prove native PowerPoint layout.

## Files changed

`src/App.tsx`; `src/components/cube/{CubeCell.ts,CubeDataTable.tsx,CubeRenderer.tsx,CubeSvg.ts}`; `src/components/editor/{AdvancedSettings.tsx,DimensionEditor.tsx}`; `src/components/operations/{DicePanel.tsx,DrilldownPanel.tsx,OperationTabs.tsx,SlicePanel.tsx}`; `src/components/presentation/SlidePreview.tsx`; `src/engine/{cubeEngine.ts,cubeGeometry.ts,optimizationRegression.test.ts}`; `src/export/{pptxExport.ts,presentationModel.ts,titleLayout.ts}`; `scripts/{benchmark.config.ts,svg-benchmark.test.ts}`; this report.
