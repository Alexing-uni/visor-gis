// Independent check: generate the app's selected record indices for audit-counts.py (GEOS).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { bbox } from '@turf/turf';
import { normalize } from '../src/lib/geojson.ts';
import { defaultLayers } from '../src/config/defaultLayers.ts';
import { analyzeLayers, selectionPolygon } from '../src/lib/analysis.ts';
const datasets=defaultLayers.map(config=>({id:config.id,name:config.name,config,data:normalize(JSON.parse(readFileSync(new URL(`../public/data/${config.source}`,import.meta.url),'utf8')),config.crs,config.kind)}));
const cases=[];
for(const layer of datasets){
  const [w,s,e,n]=bbox(layer.data),dx=e-w,dy=n-s;
  const p=(x,y)=>[w+x*dx,s+y*dy];
  const rect=(a,b,c,d)=>[...p(a,b),...p(c,d)];
  const selections=[['full',rect(-.01,-.01,1.01,1.01)],['center',rect(.25,.25,.75,.75)],['outside',rect(1.1,1.1,1.2,1.2)],
    ['triangle',selectionPolygon([p(.15,.15),p(.85,.15),p(.5,.85)])],
    ['concave',selectionPolygon([[.1,.1],[.9,.1],[.9,.9],[.65,.9],[.65,.35],[.35,.35],[.35,.9],[.1,.9]].map(([x,y])=>p(x,y)))]];
  for(let x=0;x<3;x++)for(let y=0;y<3;y++)selections.push([`grid-${x}-${y}`,rect(x/3,y/3,(x+1)/3,(y+1)/3)]);
  for(const [name,selection] of selections){
    const result=analyzeLayers([layer],selection),selected=new Set(result.selectedByLayer[layer.id].features);
    const indices=layer.data.features.flatMap((f,i)=>selected.has(f)?[i]:[]);
    cases.push({name:`${layer.id}/${name}`,layerId:layer.id,selection:result.selection,indices,total:result.totalCount,warnings:result.warnings});
  }
}
const f=(type,coordinates)=>({type:'Feature',properties:{},geometry:{type,coordinates}});
const ring=(w,s,e,n)=>[[w,s],[e,s],[e,n],[w,n],[w,s]];
const grid=[];for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)grid.push([x,y]);
const features=grid.map(p=>f('Point',p));
for(let i=0;i<grid.length;i++)for(let j=i+1;j<grid.length;j++)features.push(f('LineString',[grid[i],grid[j]]));
for(let x=-3;x<3;x++)for(let y=-3;y<3;y++)features.push(f('Polygon',[ring(x,y,x+2,y+2)]));
features.push(f('MultiPoint',[[0,0],[1,1],[3,3]]),f('MultiLineString',[[[-2,0],[2,0]],[[-2,1],[2,1]]]),f('MultiPolygon',[[ring(-2,-2,0,0)],[ring(1,1,2,2)]]),f('Polygon',[ring(-3,-3,3,3),ring(-1,-1,1,1).reverse()]));
const boundaryLayer={id:'boundary',name:'boundary',config:{visible:true,opacity:1},data:{type:'FeatureCollection',features}};
datasets.push(boundaryLayer);
for(const [name,selection] of [['square',[-1,-1,1,1]],['triangle',selectionPolygon([[-1,-1],[1,-1],[0,1]])],['concave',selectionPolygon([[-2,-2],[2,-2],[2,2],[0,0],[-2,2]])]]){
  const result=analyzeLayers([boundaryLayer],selection),selected=new Set(result.selectedByLayer.boundary.features);
  cases.push({name:`boundary/${name}`,layerId:'boundary',selection:result.selection,indices:features.flatMap((f,i)=>selected.has(f)?[i]:[]),total:result.totalCount,warnings:result.warnings});
}
mkdirSync('.tmp',{recursive:true});
writeFileSync('.tmp/count-audit.json',JSON.stringify({datasets:datasets.map(l=>({id:l.id,features:l.data.features})),cases}));
console.log(JSON.stringify(cases.map(({name,total,warnings})=>({name,total,warnings:warnings.length})),null,2));
