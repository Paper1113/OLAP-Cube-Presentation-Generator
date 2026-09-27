# OLAP Cube Presentation Generator

An educational, browser-only application for defining a three-dimensional OLAP dataset, exploring core OLAP operations, and exporting clear data-cube diagrams to SVG, PNG, and PowerPoint.

## Screenshot

> Screenshot placeholder: run the app with the built-in IKEA-style demo and add a current interface image here.

## Features

- Define exactly three dimensions, their hierarchy levels, members, and parent-member relationships.
- Edit fact data in a grid or paste tab-separated rows from Excel.
- Visualize a hierarchy-aware data cube in SVG using readable pseudo-3D cells, labels, values, and axes.
- Explore Original, Slice, Dice, Roll-up, and Drill-down views.
- Aggregate values with `SUM` without mutating raw fact records.
- Export the active diagram as SVG or high-resolution PNG.
- Generate a six-slide `.pptx` presentation entirely in the browser with PptxGenJS.
- Preview the presentation slides in the app before export.
- Save the working dataset and operation settings locally in the browser with LocalStorage.
- Deploy as a static GitHub Pages site; no backend, authentication, database, Firebase, or cloud storage is needed.

## Technology

- React, TypeScript, and Vite
- SVG for cube rendering
- PptxGenJS for PowerPoint generation
- Vitest for pure OLAP-engine tests
- LocalStorage for optional persistence

## Local setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The first launch uses an IKEA-style sales demo with Time, Product, and Location hierarchies.

Useful commands:

```bash
npm run test
npm run build
npm run preview
```

`npm run build` performs a strict TypeScript build and creates the static site in `dist/`.

## Using the demo

1. Start with **Original** to see quarterly sales by product and city.
2. Choose **Slice** and select a single member, such as `Location = Perth`.
3. Choose **Dice** and select member subsets across all three dimensions to form a smaller sub-cube.
4. Choose **Roll-up** to aggregate a dimension, for example `Location: City -> Country`.
5. Choose **Drill-down** to expand a dimension, for example `Time: Quarter -> Month`.
6. Export the current diagram or generate the complete PowerPoint presentation.

## OLAP behaviour

### Slice

Slice fixes exactly one member in one dimension and retains the other two dimensions. For example, selecting Perth from Location produces a Time x Product plane for Perth.

### Dice

Dice retains user-selected member subsets from multiple dimensions. The resulting diagram is a real sub-cube, not merely a highlighted version of the original cube.

### Roll-up

Roll-up moves a dimension to a higher hierarchy level and aggregates leaf facts with `SUM`. A City-to-Country roll-up therefore combines Perth and Sydney values under Australia while leaving raw facts unchanged.

### Drill-down

Drill-down moves a dimension to a lower level only when usable lower-level facts are present. If a dataset contains a total for `Q1` but no member-level facts for `Jan`, `Feb`, or `Mar`, the application reports that drill-down is unavailable instead of inventing values. This rule keeps the educational diagrams numerically correct.

## Architecture

```text
Raw CubeDataset
      |
      v
Pure OLAP engine (hierarchy traversal, selection, aggregation)
      |
      v
CubeViewModel
      |
      v
SVG cube renderer / export helpers / presentation preview
```

The code is organized by responsibility:

```text
src/
  components/       React editors, operation controls, SVG cube, preview
  demo/             hierarchy-aware IKEA-style dataset
  engine/           pure hierarchy, aggregation, OLAP, and geometry logic
  export/           SVG, PNG, and PptxGenJS helpers
  models/           domain and operation types
  utils/            IDs, clipboard parsing, LocalStorage
```

## GitHub Pages deployment

The included workflow at `.github/workflows/deploy.yml` builds and deploys the `dist/` directory whenever changes are pushed to `main`.

Before the first deployment:

1. Commit the npm lockfile produced by `npm install`; the workflow intentionally uses `npm ci` for repeatable builds.
2. In the repository’s GitHub settings, set **Pages > Build and deployment > Source** to **GitHub Actions**.
3. Push the `main` branch.

Vite detects the GitHub Actions repository name and uses the matching repository subpath as its production base URL. The application is a single-page interface without client-side routes, so refreshing the published page does not need a routing fallback.

## Limitations of the first release

- The visual model intentionally represents exactly three dimensions.
- `SUM` is the implemented aggregation method; the engine is structured so other methods can be added later.
- This is an educational diagram generator rather than a connection to a live OLAP server, MDX, XMLA, Power BI, or SSAS.
