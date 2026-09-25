import test from 'node:test';
import assert from 'node:assert/strict';
import { area, bboxPolygon, distance } from '@turf/turf';
import { analyzeLayers, buildAnalysisCsv, buildAnalysisJson, clippedLineLengthKm, isIdentifierAttribute, selectedGeoJson, selectionPolygon } from '../src/lib/analysis.ts';

const feature = (type, coordinates, properties = {}) => ({ type: 'Feature', properties, geometry: { type, coordinates } });
const layer = (id, features, extra = {}) => ({ id, name: id, config: { visible: true, opacity: 1, ...extra }, data: { type: 'FeatureCollection', features } });
const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≈ ${expected}`);
const ring = (west, south, east, north) => [[west, south], [east, south], [east, north], [west, north], [west, south]];

test('Análisis: intersección geométrica real, puntos de borde y MultiPoint contado una vez', () => {
  const points = layer('points', [feature('Point', [0, 0]), feature('Point', [1, 1]), feature('Point', [1.001, 1]), feature('MultiPoint', [[0.2, 0.2], [0.8, 0.8], [4, 4]])]);
  // Bounding boxes overlap the selection, but the actual diagonal stays outside.
  const lines = layer('lines', [feature('LineString', [[-1, 0.2], [0.2, 2]])]);
  const result = analyzeLayers([points, lines], [0, 0, 1, 1]);
  assert.equal(result.totalCount, 3);
  assert.deepEqual(result.counts, { point: 3, line: 0, polygon: 0 });
  assert.equal(result.selectedByLayer.points.features.length, 3);
  assert.equal(result.selectedByLayer.lines.features.length, 0);
  close(result.areaM2, area(bboxPolygon([0, 0, 1, 1])));
  close(result.areaKm2, result.areaM2 / 1e6);
  close(result.areaHa, result.areaM2 / 1e4);
});

test('Análisis: líneas recortadas, partes MultiLineString, bordes y contacto puntual', () => {
  const crossing = feature('LineString', [[-2, 0], [3, 0]]);
  const multi = feature('MultiLineString', [[[-2, 0], [3, 0]], [[3, 0], [4, 0]]]);
  const edge = feature('LineString', [[0, -1], [1, -1]]);
  const tangent = feature('LineString', [[-1, -2], [0, -1]]);
  const bounds = [0, -1, 1, 1];
  const result = analyzeLayers([layer('lines', [crossing, multi, edge, tangent])], bounds);
  assert.equal(result.totalCount, 4);
  assert.equal(result.counts.line, 4);
  close(result.lineLengthKm, 2 * distance([0, 0], [1, 0]) + distance([0, -1], [1, -1]));
  close(clippedLineLengthKm(tangent.geometry, bounds), 0);
  close(clippedLineLengthKm(feature('LineString', [[-2, 2], [3, 2]]).geometry, bounds), 0);
  close(clippedLineLengthKm(feature('LineString', [[0.5, 0], [0.5, 0]]).geometry, bounds), 0);
});

test('Análisis: huecos de polígonos no cuentan como interior y el recorte conserva el hueco', () => {
  const donut = feature('Polygon', [ring(0, 0, 10, 10), ring(2, 2, 8, 8).reverse()]);
  const onlyHole = analyzeLayers([layer('polygon', [donut])], [3, 3, 4, 4]);
  assert.equal(onlyHole.totalCount, 0);
  assert.equal(onlyHole.polygonAreaKm2, 0);
  const cropped = analyzeLayers([layer('polygon', [donut])], [1, 1, 9, 9]);
  assert.equal(cropped.totalCount, 1);
  const expected = area(feature('Polygon', [ring(1, 1, 9, 9), ring(2, 2, 8, 8).reverse()])) / 1e6;
  close(cropped.polygonAreaKm2, expected, 1e-7);
});

test('Análisis: MultiPolygon es una entidad, áreas solapadas se suman, tocar borde aporta cero área', () => {
  const multi = feature('MultiPolygon', [[ring(0, 0, 1, 1)], [ring(2, 0, 3, 1)], [ring(5, 0, 6, 1)]]);
  const overlapping = feature('Polygon', [ring(0, 0, 1, 1)]);
  const touch = feature('Polygon', [ring(4, 0, 5, 1)]);
  const result = analyzeLayers([layer('polygons', [multi, overlapping, touch])], [0, 0, 4, 1]);
  assert.equal(result.totalCount, 3);
  assert.equal(result.counts.polygon, 3);
  close(result.polygonAreaKm2, 3 * area(bboxPolygon([0, 0, 1, 1])) / 1e6, 1e-7);
  assert.equal(result.warnings.length, 0);
});

test('Análisis: estadísticas finitas, exclusión de IDs y códigos, n por atributo y entidades completas', () => {
  const result = analyzeLayers([layer('a', [
    feature('Point', [0, 0], { id: 77, objectId: 7, CODIGO: 99, poblacion: 10, altura: 3, texto: '12', invalido: Infinity }),
    feature('Point', [1, 1], { id: 78, objectId: 8, CODIGO: 100, poblacion: 20, altura: null }),
    feature('Point', [5, 5], { poblacion: 9999, altura: 9999 }),
  ])], [0, 0, 1, 1]);
  assert.deepEqual(result.layers[0].numericStats, [
    { attribute: 'altura', count: 1, min: 3, max: 3, sum: 3, mean: 3 },
    { attribute: 'poblacion', count: 2, min: 10, max: 20, sum: 30, mean: 15 },
  ]);
  assert.deepEqual(result.layers[0].excludedNumericAttributes, ['CODIGO', 'id', 'objectId']);
  assert.equal(isIdentifierAttribute('fid_1'), true);
  assert.equal(isIdentifierAttribute('osm_id'), true);
  assert.equal(isIdentifierAttribute('Código'), true);
  assert.equal(isIdentifierAttribute('cantidad'), false);
});

test('Análisis: capas ocultas excluidas, exportación conserva Multi y neutraliza fórmulas CSV', () => {
  const visible = layer('__proto__', [feature('MultiPoint', [[0, 0], [4, 4]], { cantidad: 2 })]);
  visible.name = '=SUM(A1:A2)';
  const result = analyzeLayers([visible, layer('hidden', [feature('Point', [0, 0])], { visible: false }), layer('transparent', [feature('Point', [0, 0])], { opacity: 0 })], [-1, -1, 1, 1]);
  assert.equal(result.totalCount, 1);
  assert.equal(result.hiddenLayerCount, 2);
  const json = JSON.parse(buildAnalysisJson(result));
  assert.equal(json.totalCount, 1);
  assert.equal(json.selectedByLayer, undefined);
  assert.match(json.criterion, /Cada Feature/);
  const csv = buildAnalysisCsv(result);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /'=SUM/);
  const exported = selectedGeoJson(result);
  assert.equal(exported.features.length, 1);
  assert.equal(exported.features[0].geometry.type, 'MultiPoint');
  assert.equal(exported.features[0].geometry.coordinates.length, 2);
  assert.equal(exported.features[0].properties._visor_layer_id, '__proto__');
  assert.equal(visible.data.features[0].properties._visor_layer_id, undefined);
});

test('Análisis: rectángulos inválidos y selección vacía no inventan resultados', () => {
  for (const bounds of [[0, 0, 0, 1], [1, 0, 0, 1], [0, 0, 1, NaN], [-181, 0, 1, 1], [-170, 0, 170, 1]]) assert.throws(() => analyzeLayers([], bounds));
  const result = analyzeLayers([], [0, 0, 1, 1]);
  assert.equal(result.totalCount, 0);
  assert.deepEqual(result.layers, []);
  assert.equal(result.lineLengthKm, 0);
  assert.equal(result.polygonAreaKm2, 0);
});

test('Magnitudes no aditivas y campos auxiliares no generan estadísticas engañosas', () => {
  const data={type:'FeatureCollection',features:[{type:'Feature',properties:{TOTPOP_CY:10,Orient_1:350,Pend_1:20,left:1,row_index:2,Riesgo:2,apportionmentConfidence:3},geometry:{type:'Point',coordinates:[0,0]}},{type:'Feature',properties:{TOTPOP_CY:20,Orient_1:10,Pend_1:40},geometry:{type:'Point',coordinates:[0,0]}}]};
  const result=analyzeLayers([{id:'p',name:'p',data,config:{visible:true,opacity:1}}],[-1,-1,1,1]);
  const stats=result.layers[0].numericStats;
  assert.equal(stats.find(s=>s.attribute==='TOTPOP_CY').sum,30);
  assert.equal(stats.find(s=>s.attribute==='Orient_1').mean,null);
  assert.equal(stats.find(s=>s.attribute==='Pend_1').sum,null);
  assert.equal(stats.find(s=>s.attribute==='Pend_1').mean,30);
  assert.equal(stats.find(s=>s.attribute==='apportionmentConfidence').sum,null);
  assert.ok(!stats.some(s=>['left','row_index','Riesgo'].includes(s.attribute)));
});

test('Selección libre: triángulo usa el contorno real, conserva Multi y exporta su geometría', () => {
  const polygon=selectionPolygon([[0,0],[2,0],[0,2]]);
  const result=analyzeLayers([layer('p',[
    feature('Point',[0.25,0.25],{cantidad:10}),feature('Point',[1.5,1.5],{cantidad:999}),
    feature('MultiPoint',[[1,1],[3,3]],{cantidad:20})
  ])],polygon);
  assert.equal(result.totalCount,2);
  assert.equal(result.layers[0].numericStats[0].sum,30);
  close(result.areaM2,area(polygon));
  const exported=JSON.parse(buildAnalysisJson(result));
  assert.equal(exported.selectionKind,'polygon');
  assert.deepEqual(exported.selection.geometry,polygon.geometry);
});

test('Selección libre cóncava: suma tramos interiores separados y bordes, sin medir el hueco exterior', () => {
  const polygon=selectionPolygon([[0,0],[3,0],[3,3],[2,3],[2,1],[1,1],[1,3],[0,3]]);
  const result=analyzeLayers([layer('l',[
    feature('MultiLineString',[[[-1,2],[4,2]],[[-1,0],[4,0]]]),
    feature('LineString',[[1.2,2],[1.8,2]]),
    feature('LineString',[[-1,3],[0,3]])
  ])],polygon);
  assert.equal(result.totalCount,2);
  close(result.lineLengthKm,distance([0,2],[1,2])+distance([2,2],[3,2])+distance([0,0],[3,0]));
  assert.deepEqual(result.warnings,[]);
});

test('Selección libre: recorta superficies al triángulo y conserva huecos de las entidades', () => {
  const polygon=selectionPolygon([[0,0],[4,0],[0,4]]);
  const hole=ring(0.5,0.5,1,1).reverse();
  const result=analyzeLayers([layer('a',[feature('Polygon',[ring(-1,-1,5,5),hole])])],polygon);
  close(result.polygonAreaKm2,(area(polygon)-area(feature('Polygon',[hole])))/1e6,1e-7);
  assert.equal(result.totalCount,1);
});

test('El mismo contorno rectangular produce iguales recuentos, estadísticas y medidas en modo libre', () => {
  const layers=[layer('a',[feature('Point',[1,1],{cantidad:7}),feature('LineString',[[-1,1],[3,1]]),feature('Polygon',[ring(1,1,3,3)])])];
  const rectangular=analyzeLayers(layers,[0,0,2,2]);
  const free=analyzeLayers(layers,selectionPolygon(ring(0,0,2,2)));
  assert.equal(rectangular.totalCount,free.totalCount);
  assert.deepEqual(rectangular.layers,free.layers);
  close(rectangular.areaM2,free.areaM2);
});

test('Selección libre rechaza contornos abiertos, cruces, repetidos, puntos alineados y antimeridiano', () => {
  assert.throws(()=>analyzeLayers([],feature('Polygon',[[[0,0],[1,0],[0,1]]])),/Cierra/);
  for(const points of [ [[0,0],[1,0]], [[0,0],[2,2],[0,2],[2,0]], [[0,0],[1,1],[2,2]], [[0,0],[1,0],[1,1],[1,0]], [[-179,0],[179,0],[179,1]], [[0,0],[NaN,1],[1,1]] ]) {
    assert.throws(()=>selectionPolygon(points));
  }
});
