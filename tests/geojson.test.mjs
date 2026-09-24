import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import bbox from '@turf/bbox';
import { normalize, canonicalCrs, validateDataset } from '../src/lib/geojson.ts';
import { destination } from '../src/lib/viewport.ts';
import { createLayer } from '../src/model/createLayer.ts';
const read = name => JSON.parse(readFileSync(new URL(`../public/data/${name}.geojson`, import.meta.url), 'utf8'));

test('Los tres datasets reales se normalizan; MultiLineString conserva Z y Chile/Asturias permanecen separados', () => {
  const points = normalize(read('points'), 'EPSG:31994', 'point');
  const polygons = normalize(read('polygons'), 'EPSG:4326', 'polygon');
  const rawLines = read('lines');
  const lines = normalize(rawLines, 'EPSG:4258', 'line');
  assert.equal(points.features.length, 9999);
  assert.equal(polygons.features.length, 399);
  assert.equal(lines.features.length, 6233);
  const first = points.features[0].geometry.coordinates;
  assert.ok(Math.abs(first[0] - (-72.99920856)) < 0.00001);
  assert.ok(Math.abs(first[1] - (-39.64873933)) < 0.00001);
  assert.ok(bbox(points)[3] < 0);
  assert.ok(bbox(polygons)[3] < 0);
  assert.ok(bbox(lines)[1] > 43);
  assert.equal(lines.features[0].geometry.type, 'MultiLineString');
  assert.equal(lines.features[0].geometry.coordinates[0][0][2], rawLines.features[0].geometry.coordinates[0][0][2]);
  assert.deepEqual(polygons.features[0].geometry, read('polygons').features[0].geometry);
  assert.equal(points.crs, undefined);
  assert.equal(rawLines.crs.properties.name, 'urn:ogc:def:crs:EPSG::4258');
});
test('Validación rechaza coordenadas, anillos, geometrías y CRS incompatibles', () => {
  const point = {type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:['bad',false]}}]};
  assert.throws(() => validateDataset(point), /números finitos/);
  point.features[0].geometry.coordinates = [0, 0];
  assert.throws(() => validateDataset(point, 'line'), /incompatible/);
  assert.throws(() => normalize({...point,crs:{type:'name',properties:{name:'EPSG:4258'}}}, 'EPSG:31994'), /CRS incompatible/);
  assert.equal(canonicalCrs('urn:ogc:def:crs:OGC:1.3:CRS84'), 'EPSG:4326');
  const polygon={type:'FeatureCollection',features:[{type:'Feature',properties:null,geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1]]]}}]};
  assert.throws(() => validateDataset(polygon), /sin cerrar/);
});
test('Símbolos en píxeles, opacidad de toda la capa y atributos filtrados', () => {
  const config={id:'points',kind:'point',name:'Prueba',source:'points.geojson',crs:'EPSG:31994',visible:true,stroke:'#112233',fill:'#445566',width:2,opacity:0.3,radius:5,sort_order:0};
  const model=createLayer(config,normalize(read('points'),'EPSG:31994','point'));
  const deck=model.toDeckLayer(()=>{});
  assert.equal(deck.props.pointRadiusUnits,'pixels');
  assert.equal(deck.props.getPointRadius,5);
  assert.equal(deck.props.lineWidthUnits,'pixels');
  assert.equal(deck.props.opacity,0.3);
  assert.ok(model.attributes(model.data.features[0]).some(x=>x.label==='ID'));
  assert.ok(!model.attributes(model.data.features[0]).some(x=>x.label==='left'));
  const polygon=createLayer({...config,id:'polygons',kind:'polygon'},normalize(read('polygons'),'EPSG:4326','polygon')).toDeckLayer(()=>{});
  assert.equal(polygon.props.opacity,0.3);
  assert.equal(polygon.props.getLineColor.length,3);
});
test('Búsqueda acepta ubicaciones con bounds y ubicaciones con solo centro', () => {
  assert.deepEqual(destination({center:[-5.84,43.36]}),{center:[-5.84,43.36]});
  assert.deepEqual(destination({center:[0,0],bounds:[-6,43,-5,44]}),{bounds:[-6,43,-5,44]});
});
