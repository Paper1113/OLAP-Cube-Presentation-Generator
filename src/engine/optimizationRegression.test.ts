import { RollupPanel, availableRollupTransition } from "../components/operations/RollupPanel";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DrilldownPanel } from "../components/operations/DrilldownPanel";
import {describe, it, expect, vi} from 'vitest';
import App from '../App';
import {formatCubeCellValue} from '../components/cube/CubeCell';
import {generateIndustryWorkspace} from '../generator/datasetGenerator';
import {validatePresentation, buildPresentationSlides, presentationErrors} from '../export/presentationModel';
import {layoutDatasetTitle} from '../export/titleLayout';
import {createCubeView, validateCubeRequest} from './cubeEngine';
import {synchronizeLeafFacts} from '../generator/factSynchronizer';
import {createCubeSvgMarkup} from '../components/cube/CubeSvg';
const workspace=()=>generateIndustryWorkspace({title:'Regression',industryId:'furniture-home',random:()=>.3});
describe('precision and presentation preflight',()=>{
 it.each([[0,'0'],[-0,'0'],[.004,'0.004'],[-.004,'-0.004'],[1234,'1,234'],[1234.567,'1,234.57'],[.009999,'0.009999'],[.0099999,'0.01'],[.0001,'0.0001'],[.00009999,'9.999e-5'],[1e9,'1e+9'],[999999999.999,'1e+9'],[Number.MIN_VALUE,'4.941e-324']])('formats %s as %s',(value,label)=>expect(formatCubeCellValue(value as number)).toBe(label));
 it('reports offscreen invalid operations while Original is valid',()=>{
  const w=workspace();w.operations.dice.selections.time=['removed'];w.operations.drilldown.targetLevelId='removed';
  expect(createCubeView(w.dataset,{...w,operation:{type:'original'}}).view).not.toBeNull();
  expect(validatePresentation(w).map(issue=>issue.kind)).toEqual(['dice','drilldown']);
  expect(presentationErrors(buildPresentationSlides(w))).toHaveLength(2);
 });
 it('preflight and full engine share removed level rejection without mutating settings',()=>{
  const w=workspace();w.activeLevels.time='removed';const before=JSON.stringify(w);
  const req={...w,operation:{type:'original'} as const};
  expect(validateCubeRequest(w.dataset,req)).toEqual(createCubeView(w.dataset,req).errors);
  expect(validatePresentation(w)).toHaveLength(5);expect(JSON.stringify(w)).toBe(before);
 });
 it('rebuild retains values and stale operation IDs for explicit repair',()=>{
  const w=workspace();w.operations.slice.memberId='removed';const settings=JSON.stringify(w.operations);
  const facts=w.dataset.facts;const rebuilt=synchronizeLeafFacts(w.dataset);
  expect(rebuilt.facts).toEqual(facts);expect(w.operations.slice.memberId).toBe('removed');expect(settings).toBe(JSON.stringify(w.operations));
 });
 it('distinguishes a missing Drill-down source from a valid lowest level',()=>{
  const w=workspace();w.activeLevels.time='removed';
  const render=()=>renderToStaticMarkup(createElement(DrilldownPanel,{dataset:w.dataset,activeLevels:w.activeLevels,drilldown:w.operations.drilldown,onChange:()=>{}}));
  expect(render()).toContain('Original cube level is unavailable');
  expect(render()).toContain('select Original cube level');
  expect(render()).not.toContain('This dimension is already at its lowest');
  w.activeLevels.time='time-month';
  expect(render()).toContain('This dimension is already at its lowest');
  expect(render()).not.toContain('Original cube level is unavailable');
 });
 it('does not offer a fallback Roll-up transition for a removed visible level',()=>{
  const w=workspace();w.activeLevels.time='removed';
  expect(availableRollupTransition(w.dataset,w.dataset.dimensions[0],w.activeLevels)).toBeUndefined();
  const html=renderToStaticMarkup(createElement(RollupPanel,{dataset:w.dataset,activeLevels:w.activeLevels,rollup:w.operations.rollup,onChange:()=>{}}));
  expect(html).toContain('Original cube level is unavailable');
  expect(html).toContain('Select Original cube level again');
  expect(html).not.toContain('>Month</output>');
 });
 it('final validation still detects aggregate overflow excluded from preflight',()=>{
  const w=workspace();w.dataset.facts.forEach(f=>f.measures.sales=Number.MAX_VALUE);
  expect(validatePresentation(w)).toEqual([]);expect(presentationErrors(buildPresentationSlides(w)).length).toBeGreaterThan(0);
 });
 it('disables PowerPoint for a known current SUM overflow despite valid preflight',()=>{
  const w=workspace();w.dataset.facts.forEach(f=>f.measures.sales=Number.MAX_VALUE);
  expect(validatePresentation(w)).toEqual([]);
  vi.stubGlobal('window',{localStorage:{getItem:()=>JSON.stringify(w)}});
  try {
    const html=renderToStaticMarkup(createElement(App));
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Export PowerPoint<\/button>/);
    expect(html).toContain('SUM');
  } finally { vi.unstubAllGlobals(); }
 });
 it('retains complete values and coordinates in SVG without numeric ellipsis',()=>{
  const w=workspace();w.dataset.facts.forEach(f=>f.measures.sales=.004);
  const view=createCubeView(w.dataset,{...w,operation:{type:'original'}}).view!;
  const svg=createCubeSvgMarkup(view);expect(svg).toContain(String(view.cells[0].value));expect(svg).toContain(view.cells[0].xMemberId);
  expect([...svg.matchAll(/data-cube-value="true"[^>]*>([^<]*)/g)].every(m=>!m[1].includes('…'))).toBe(true);
 });
 it.each(['Short title','More than twenty four characters should remain readable','中文數據分析及銷售報告'.repeat(8),'OLAP 年度銷售分析 Report '.repeat(10)])('shares two-line title layout for %s',title=>{
  const visible=layoutDatasetTitle(title);expect(visible.split('\n').length).toBeLessThanOrEqual(2);
  if(title.length<60)expect(visible.replaceAll('\n','')).toBe(title);
 });
});
