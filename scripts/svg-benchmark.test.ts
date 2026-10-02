import { createCubeSvgMarkup } from '../src/components/cube/CubeSvg';
import type { CubeViewModel } from '../src/models/cube';
export function benchmark() {
 for (const n of [5,10,15,20]) {
 const axis = (id: string) => ({dimensionId:id,dimensionName:id,levelId:id,levelName:id,members:Array.from({length:n},(_,i)=>({id:String(i),label:String(i)}))});
 const view: CubeViewModel={datasetTitle:'Benchmark',measure:{id:'sales',name:'Sales',aggregation:'sum'},x:axis('x'),y:axis('y'),z:axis('z'),operationLabel:'Original',description:'Benchmark',cells:[]};
 for(let x=0;x<n;x++)for(let y=0;y<n;y++)for(let z=0;z<n;z++)view.cells.push({xMemberId:String(x),yMemberId:String(y),zMemberId:String(z),value:1234.56,hasData:true});
 const times=[]; for(let run=0;run<6;run++){const start=performance.now();createCubeSvgMarkup(view);const elapsed=performance.now()-start;if(run)times.push(elapsed);}
 console.log(JSON.stringify({cells:n**3,medianMs:times.sort((a,b)=>a-b)[2],runsMs:times}));
 }
}
import { it } from "vitest";
it("measures SVG generation", benchmark);
