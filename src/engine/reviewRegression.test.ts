import { expect, it } from 'vitest';
import { generateIndustryWorkspace } from '../generator/datasetGenerator';
import { synchronizeLeafFacts } from '../generator/factSynchronizer';
import { createCubeView } from './cubeEngine';
import { sumValues } from './aggregation';
import { validateDataset } from './validation';
import { exportPresentation } from '../export/pptxExport';
const sample = () => generateIndustryWorkspace({title: 'Review', industryId: 'furniture-home', random: () => .3});
it.each(['leaf', 'all', 'new'])('rejects incomplete %s hierarchy before replacing facts', (kind) => {
  const w = sample();
  const product = w.dataset.dimensions[1];
  if (kind === 'new') product.levels.push({id: 'new', name: 'New', order: 9, members: []});
  else if (kind === 'all') product.levels.forEach(l => l.members = []);
  else product.levels.at(-1)!.members = [];
  const original = structuredClone(w.dataset.facts);
  expect(validateDataset(w.dataset).length).toBeGreaterThan(0);
  expect(() => synchronizeLeafFacts(w.dataset)).toThrow(/member/i);
  expect(w.dataset.facts).toEqual(original);
});
it('blocks SUM overflow rather than creating non-finite cells', () => {
  const w = sample(); w.dataset.facts.forEach(f => f.measures.sales = 1e308);
  const result = createCubeView(w.dataset, {...w, operation: {type: 'original'}});
  expect(result.view).toBeNull(); expect(result.errors.join(' ')).toMatch(/SUM.*overflow/i);
});
it('allows cancellation before deciding whether a SUM overflows', () => {
  expect(sumValues([1e308, 1e308, -1e308])).toBe(1e308);
  expect(() => sumValues([1e308, 1e308])).toThrow(/SUM.*overflow/i);

  const w = sample();
  const template = structuredClone(w.dataset.facts[0]);
  w.dataset.facts = [
    { ...template, measures: { sales: 1e308 } },
    { ...template, measures: { sales: 1e308 } },
    { ...template, measures: { sales: -1e308 } },
  ];
  const result = createCubeView(w.dataset, { ...w, operation: { type: 'original' } });
  expect(result.errors).toEqual([]);
  expect(result.view?.cells.find((cell) => cell.hasData)?.value).toBe(1e308);
});
it('rejects removed active level instead of choosing another level', () => {
  const w = sample(); w.activeLevels.time = 'deleted';
  expect(createCubeView(w.dataset, {...w, operation: {type:'original'}}).view).toBeNull();
});
it.each(['levels', 'slice', 'dice', 'axes'])('blocks incomplete PPTX for %s', async kind => {
  const w = sample();
  if (kind === 'levels') w.activeLevels.location = 'location-city';
  if (kind === 'slice') w.operations.slice.memberId = 'deleted';
  if (kind === 'dice') w.operations.dice.selections.time = ['deleted'];
  if (kind === 'axes') w.axisMapping.y = w.axisMapping.x;
  await expect(exportPresentation(w)).rejects.toThrow(/PowerPoint blocked/);
});

it('preserves existing Sales when a valid leaf member is added', () => {
  const w = sample();
  const product = w.dataset.dimensions.find((dimension) => dimension.id === 'product')!;
  const leaf = product.levels.at(-1)!;
  const existing = w.dataset.facts[0];
  leaf.members.push({ id: 'product-new', label: 'New product', levelId: leaf.id, parentMemberId: leaf.members[0].parentMemberId });

  const synchronized = synchronizeLeafFacts(w.dataset, () => 0);
  expect(synchronized.facts).toHaveLength(12 * 5 * 3);
  expect(synchronized.facts.find((fact) => fact.coordinates === existing.coordinates)).toBe(existing);
  expect(synchronized.facts.filter((fact) => fact.coordinates.product === 'product-new').every((fact) => fact.measures.sales === 100)).toBe(true);
});
