import test from 'node:test';
import assert from 'node:assert/strict';
import {officialSources,tileUrl,validateRaster} from '../src/lib/raster.ts';
test('WMS genera una petición GetMap EPSG3857 sin arrastrar parámetros incompatibles',()=>{
 const source={...officialSources[0],url:officialSources[0].url+'?service=WMS&request=GetCapabilities&CRS=EPSG:4326'};
 const url=new URL(tileUrl(source,{x:0,y:0,z:0},[-180,-85.05112878,180,85.05112878]));
 assert.equal(url.searchParams.get('REQUEST'),'GetMap');assert.equal(url.searchParams.get('SRS'),'EPSG:3857');assert.equal(url.searchParams.has('CRS'),false);
 const b=url.searchParams.get('BBOX').split(',').map(Number);assert.ok(Math.abs(b[0]+20037508.342789)<0.1);assert.ok(Math.abs(b[3]-20037508.342789)<0.1);
 assert.equal(url.searchParams.get('LAYERS'),'OI.OrthoimageCoverage');
});
test('WMS y WMTS requieren formato compatible, HTTPS y atribución',()=>{
 assert.throws(()=>validateRaster({...officialSources[0],url:'http://example.com'}),/HTTPS/);
 assert.throws(()=>validateRaster({...officialSources[0],layers:''}),/nombre técnico/);
 assert.throws(()=>validateRaster({...officialSources[0],attribution:''}),/atribución/);
 assert.throws(()=>validateRaster({...officialSources[0],type:'wmts'}),/plantilla/);
 const wmts=validateRaster({...officialSources[0],type:'wmts',url:'https://example.org/{z}/{x}/{y}.png'});
 assert.equal(tileUrl(wmts,{z:3,x:4,y:2},[0,0,1,1]),'https://example.org/3/4/2.png');
});
