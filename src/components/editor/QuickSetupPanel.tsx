import { defaultIndustryId, getIndustryTemplate, industryTemplates } from "../../generator/industryTemplates";

interface QuickSetupPanelProps {
  title: string;
  selectedIndustryId?: string;
  generated: boolean;
  canRefreshSales: boolean;
  onTitleChange: (title: string) => void;
  onIndustryChange: (industryId: string) => void;
  onGenerate: () => void;
  onRefreshSales: () => void;
}

const templateSummary = (industryId: string) => {
  const template = getIndustryTemplate(industryId) ?? getIndustryTemplate(defaultIndustryId)!;
  const productCount = template.productCategories.reduce((count, category) => count + category.products.length, 0);
  const cityCount = template.countries.reduce((count, country) => count + country.cities.length, 0);
  return {
    name: template.name,
    productCount,
    categoryCount: template.productCategories.length,
    products: template.productCategories.flatMap((category) => category.products.map((product) => product.label)),
    cityCount,
    countryCount: template.countries.length,
    cities: template.countries.flatMap((country) => country.cities.map((city) => city.label)),
  };
};

/** The intentionally small, primary workflow for creating an industry sample. */
export const QuickSetupPanel = ({
  title,
  selectedIndustryId,
  generated,
  canRefreshSales,
  onTitleChange,
  onIndustryChange,
  onGenerate,
  onRefreshSales,
}: QuickSetupPanelProps) => {
  const industryId = getIndustryTemplate(selectedIndustryId ?? "")?.id ?? defaultIndustryId;
  const summary = templateSummary(industryId);

  return (
    <section className="editor-section quick-setup" aria-labelledby="quick-setup-heading">
      <div className="quick-setup__heading">
        <div>
          <h2 id="quick-setup-heading">Quick Setup</h2>
          <p className="hint">Create a small synthetic dataset for learning OLAP. Generated figures are not real company sales.</p>
        </div>
        <span className="quick-setup__badge">Recommended</span>
      </div>
      <label>
        Dataset title
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Global Sales Analysis"
        />
      </label>
      <label>
        Industry
        <select value={industryId} onChange={(event) => onIndustryChange(event.target.value)}>
          {industryTemplates.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </label>
      <div className="quick-setup__actions">
        <button type="button" className="primary-button" onClick={onGenerate}>
          {generated ? "Regenerate Dataset" : "Generate Dataset"}
        </button>
        <button type="button" className="secondary-button" onClick={onRefreshSales} disabled={!canRefreshSales}>
          ↻ Refresh Sales Data
        </button>
      </div>
      <p className="quick-setup__notice">
        {generated
          ? "Regenerating replaces the current generated hierarchy, facts, and default OLAP settings."
          : "Choose a preset, then generate its Time, Product, Location, and Sales data."}
      </p>
      <div className="quick-setup__summary" aria-live="polite">
        <strong>{summary.name}</strong>
        <span>{summary.productCount} Products · {summary.categoryCount} Categories</span>
        <span>{summary.cityCount} Cities · {summary.countryCount} Countries · {12 * summary.productCount * summary.cityCount} Monthly Facts</span>
        <span>Products: {summary.products.join(", ")}</span>
        <span>Locations: {summary.cities.join(", ")}</span>
      </div>
    </section>
  );
};
