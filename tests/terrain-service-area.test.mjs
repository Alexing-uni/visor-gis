import test from 'node:test';
import assert from 'node:assert/strict';
import { groundCoordinates, terrainDecoder } from '../src/lib/elevation.ts';
import { activeRasters, updateRaster } from '../src/lib/raster.ts';
import { isochroneRequest, parseServiceArea, calculateServiceArea, roadAccess } from '../src/lib/serviceArea.ts';

test('La copia de dibujo aplana Z sin modificar originales, geometrías múltiples ni atributos', () => {
  const data={type:'FeatureCollection',features:[{type:'Feature',id:1,properties:{name:'vial'},geometry:{type:'MultiLineString',coordinates:[[[1,2,800],[3,4,900]]]}}]};
  const snapshot=JSON.stringify(data), copy=groundCoordinates(data);
  assert.deepEqual(copy.features[0].geometry.coordinates,[[[1,2],[3,4]]]);
  assert.equal(JSON.stringify(data),snapshot); assert.equal(groundCoordinates(data),copy);
  assert.equal(copy.features[0].id,1); assert.equal(copy.features[0].properties.name,'vial');
});
test('Terrarium decodifica altura y aplica la misma exageración a toda la superficie, incluido cero',()=>{
  for(const scale of [0,1,2]) { const d=terrainDecoder(scale);assert.equal(128*d.rScaler+100*d.gScaler+128*d.bScaler+d.offset,100.5*scale); }
  assert.throws(()=>terrainDecoder(NaN));
});
test('Un fondo sustituye a otro sin apagar los ríos superpuestos; las preferencias antiguas no duplican fondos',()=>{
  const sources=[{id:'a',role:'base',visible:true},{id:'b',role:'base',visible:false},{id:'river',role:'overlay',visible:true}];
  const next=updateRaster(sources,'b',{visible:true});
  assert.deepEqual(activeRasters(next).map(s=>s.id),['b','river']);
  assert.equal(sources[0].visible,true);
  assert.deepEqual(activeRasters([{...sources[0]}, {...sources[1],visible:true},sources[2]]).map(s=>s.id),['b','river']);
});
const valid={type:'FeatureCollection',features:[{type:'Feature',properties:{contour:20},geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}}]};
test('La isócrona solicita 20 minutos por carretera, respeta lon/lat y valida el contorno',()=>{
  const request=isochroneRequest([-5.85,43.36],20);
  assert.equal(request.costing,'auto');assert.equal(request.locations[0].lon,-5.85);assert.deepEqual(request.contours,[{time:20}]);
  assert.equal(parseServiceArea(valid,20),valid);
  assert.throws(()=>isochroneRequest([999,0],20));assert.throws(()=>isochroneRequest([0,0],0));assert.throws(()=>isochroneRequest([0,0],61));
  assert.throws(()=>parseServiceArea(valid,30),/tiempo/);
  assert.throws(()=>parseServiceArea({type:'FeatureCollection',features:[]},20),/accesible/);
  assert.throws(()=>parseServiceArea({...valid,features:[{...valid.features[0],geometry:{type:'LineString',coordinates:[[0,0],[1,1]]}}]},20));
});
test('Servicio de alcance: éxito, cuota, falta de acceso, fallo y cancelación sin fabricar resultados',async()=>{
  const result=await calculateServiceArea([0,0],20,undefined,async(url,options)=>{
    if(url.includes('/locate?')) return new Response(JSON.stringify([{edges:[{correlated_lon:0,correlated_lat:0}]}]));
    assert.equal(JSON.parse(new URL(url).searchParams.get('json')).contours[0].time,20);
    assert.equal(options.credentials,'omit');return new Response(JSON.stringify(valid));
  });assert.deepEqual(result.features,valid.features);assert.equal(result.access.distanceMetres,0);
  for(const [status,pattern] of [[429,/ocupado/],[400,/carreteras/],[503,/disponible/]]) await assert.rejects(calculateServiceArea([0,0],20,undefined,async()=>new Response('',{status})),pattern);
  const abort=new AbortController();abort.abort();
  await assert.rejects(calculateServiceArea([0,0],20,abort.signal,async(_,opts)=>{opts.signal.throwIfAborted();}),{name:'AbortError'});
});

test('Rechaza océano y carreteras demasiado lejanas antes de calcular la isócrona',async()=>{
 assert.throws(()=>roadAccess([{edges:[]}],[0,0]),/carretera/);
 assert.throws(()=>roadAccess([{edges:[{correlated_lon:1,correlated_lat:1}]}],[0,0]),/carretera/);
 let calls=0;
 await assert.rejects(calculateServiceArea([-30,0],20,undefined,async()=>{calls++;return new Response(JSON.stringify([{edges:[]}]));}),/carretera/);
 assert.equal(calls,1);
});
