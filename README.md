# OLAP Cube Presentation Generator

An educational, browser-only app for generating a small industry sales cube, exploring core OLAP operations, and exporting clear diagrams to SVG, PNG, and PowerPoint. Generated figures are synthetic examples only; they do not represent real company sales.

## Quick Setup

The default flow needs only three actions:

1. Enter a **Dataset title**.
2. Select an **Industry**.
3. Select **Generate Dataset** (or **Regenerate Dataset** after a sample has been created).

Each preset creates a presentation-sized data cube with exactly three dimensions:

```text
Time       Year → Quarter → Month
Product    Category → Product
Location   Country → City
```

Raw facts stay at Month × Product × City. The standard cube contains 12 months, 4 products, 3 cities, and 144 Sales facts. Quarter, Category, and Country values are derived by the existing SUM aggregation engine rather than stored as duplicate facts.

The available industry samples are:

- Furniture & Home Living
- Consumer Electronics
- Fashion & Apparel
- Grocery & Supermarket
- Automotive
- Food & Beverage
- Hospitality & Travel
- Healthcare & Pharmacy
- Sports & Fitness
- Beauty & Personal Care

## Generate Dataset vs Refresh Sales Data

These controls are intentionally different:

- **Generate Dataset** replaces the generated Time, Product, and Location hierarchies; recreates every leaf coordinate and Sales fact; and restores the default OLAP settings for the selected industry.
- **Refresh Sales Data** changes only the synthetic `Sales` values. It keeps the dataset title, hierarchies, fact coordinate objects, axis mapping, active levels, and current operation settings.

Changing the industry dropdown by itself never replaces the current dataset. Generate only when the chosen preset is ready to apply.

## OLAP Operations

The core controls remain outside Advanced Settings:

1. **Original** — Quarterly Sales by Product Category and Country.
2. **Slice** — Fix one member, such as a City.
3. **Dice** — Select member subsets across all three dimensions.
4. **Roll-up** — Aggregate Quarter to Year, Product to Category, or City to Country.
5. **Drill-down** — Expand Quarter to Month, Country to City, or Category to Product.

The current diagram can be exported as SVG or high-resolution PNG, and the generated workspace can be rendered in the presentation preview or downloaded as a six-slide PowerPoint file.

## Advanced Settings

Advanced Settings is collapsed by default so first-time users are not required to edit dimensions or facts. It contains:

- Cube axis mapping.
- Dimension, hierarchy, category, product, country, and city editing.
- Fact Data, where Month/Product/City are read-only contextual labels and only Sales can be edited or randomized.
- **Apply Changes & Rebuild Facts**, which rebuilds the complete leaf-level Cartesian product after hierarchy edits, preserves Sales for coordinates that still exist, adds Sales for new combinations, and removes stale or duplicate combinations.
- Furniture sample and reset utilities.

## Local development

```bash
npm install
npm run dev
```

Run the regression checks with:

```bash
npm run test
npm run build
```

`npm run build` performs a strict TypeScript build and creates the static site in `dist/`.

## Architecture

```text
Industry Template
      |
      v
Dataset Generator → WorkspaceState
      |
      v
Pure OLAP engine (hierarchy traversal, selection, aggregation)
      |
      v
CubeViewModel
      |
      v
SVG cube renderer / PNG and SVG export / presentation preview / PowerPoint
```

Key source folders:

```text
src/
  components/       Quick Setup, advanced editors, operations, cube, presentation
  generator/        industry presets, workspace generator, Sales generator, fact synchronizer
  engine/           pure hierarchy, aggregation, OLAP, and geometry logic
  export/           SVG, PNG, and PptxGenJS helpers
  models/           cube, dimension, operation, and workspace types
  utils/            IDs, random Sales helper, clipboard parser, LocalStorage
```

LocalStorage saves the current workspace, including industry generation metadata when available. Older saved workspaces without that optional metadata continue to load as custom datasets.

## GitHub Pages deployment

The included workflow at `.github/workflows/deploy.yml` builds and deploys `dist/` whenever changes are pushed to `main`. It uses `npm ci` for repeatable dependencies. In the repository’s GitHub settings, set **Pages > Build and deployment > Source** to **GitHub Actions** before the first deployment.

Vite detects the GitHub Actions repository name and uses the matching repository subpath as its production base URL. The app has no client-side routes, so refreshing the published interface needs no routing fallback.

## License

This project is licensed under the [MIT License](LICENSE).


## Cube Appearance

The editor includes presentation-facing appearance controls so different users do not have to produce visually identical cubes.

- Eight preset colour palettes: Ocean, Emerald, Violet, Amber, Rose, Teal, Slate, and Coral.
- Four drawing styles: **Classic**, **Minimal**, **Handwritten**, and **Bold**.
- **Random Appearance** chooses a different palette and a different drawing style in one click.
- Appearance changes apply immediately to the live cube and are also reused by SVG/PNG downloads, presentation preview, and PowerPoint export.
- Appearance is persisted with the workspace. Older saved workspaces without appearance metadata fall back to Ocean + Classic.
