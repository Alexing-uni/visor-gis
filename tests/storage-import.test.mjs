import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { classifyImportUrl, fetchGeoJson, parseGeoJson, prepareImport } from '../src/lib/import.ts';
import { createLayerStorage, mergeLayerConfigs } from '../src/lib/storage.ts';
import { defaultLayers } from '../src/config/defaultLayers.ts';

const feature = (type, coordinates, properties = {}) => ({ type: 'Feature', geometry: { type, coordinates }, properties });
const collection = (...features) => ({ type: 'FeatureCollection', features });
const sample = () => prepareImport(collection(feature('Point', [-5.8, 43.3], { value: 3 })), 'Prueba', 'EPSG:4326', 'test');

test('Importación valida y separa geometrías mixtas; multipartes siguen siendo una entidad', () => {
  const items = prepareImport(collection(feature('MultiPoint', [[0, 0], [1, 1]]), feature('LineString', [[0, 0], [1, 1]]), feature('Polygon', [[[0, 0], [1, 0], [1, 1], [0, 0]]])), 'Mixta', 'EPSG:4326', 'mixta');
  assert.deepEqual(items.map(item => item.config.kind), ['point', 'line', 'polygon']);
  assert.deepEqual(items.map(item => item.data.features.length), [1, 1, 1]);
  assert.equal(items[0].data.features[0].geometry.type, 'MultiPoint');
  assert.equal(items[0].config.source, 'browser:import');
  assert.throws(() => prepareImport(collection(), 'Vacía'), /vacío/);
  assert.throws(() => prepareImport(collection(feature('GeometryCollection', [])), 'Colección'), /no soportada/);
  assert.throws(() => prepareImport(collection(feature('Point', [200, 95])), 'Fuera'), /fuera del rango/);
});

test('Importación transforma Web Mercator y rechaza CRS declarados incompatibles', () => {
  const raw = collection(feature('Point', [111319.49079327357, 111325.1428663851, 27]));
  const [item] = prepareImport(raw, 'Mercator', 'EPSG:3857', 'mercator');
  const [lon, lat, z] = item.data.features[0].geometry.coordinates;
  assert.ok(Math.abs(lon - 1) < 1e-7);
  assert.ok(Math.abs(lat - 1) < 1e-7);
  assert.equal(z, 27);
  assert.equal(item.config.crs, 'EPSG:4326');
  assert.throws(() => prepareImport({ ...raw, crs: { type: 'name', properties: { name: 'EPSG:3857' } } }, 'CRS', 'EPSG:4326'), /incompatible/);
});

test('URLs distinguen servicios WMS/WMTS, JSON directo y páginas sin inferir datos', () => {
  assert.equal(classifyImportUrl('https://ejemplo.es/datos.geojson'), 'geojson');
  assert.equal(classifyImportUrl('https://ejemplo.es/servicio?SERVICE=WMS&REQUEST=GetCapabilities'), 'wms');
  assert.equal(classifyImportUrl('https://ejemplo.es/wmts/pnoa'), 'wmts');
  assert.equal(classifyImportUrl('https://globalnaturewatch.org/map/'), 'unknown');
  assert.throws(() => classifyImportUrl('javascript:alert(1)'), /HTTP/);
  assert.throws(() => classifyImportUrl('https://user:pass@ejemplo.es/file.json'), /credenciales/);
  assert.throws(() => parseGeoJson('<!DOCTYPE html><title>Visor</title>'), /página web/);
  assert.throws(() => parseGeoJson('{broken'), /JSON válido/);
});

test('Descarga verifica contenido real, errores HTTP y límite de tamaño', async t => {
  let response;
  t.mock.method(globalThis, 'fetch', async () => response);
  response = new Response(JSON.stringify(collection(feature('Point', [0, 0]))), { headers: { 'content-type': 'application/geo+json' } });
  assert.equal((await fetchGeoJson('https://ejemplo.es/api/features')).features.length, 1);
  response = new Response('<html>Visor</html>', { headers: { 'content-type': 'text/html' } });
  await assert.rejects(fetchGeoJson('https://ejemplo.es/map/'), /página web/);
  response = new Response('No disponible', { status: 503 });
  await assert.rejects(fetchGeoJson('https://ejemplo.es/data.json'), /HTTP 503/);
  response = new Response('{}', { headers: { 'content-length': String(31 * 1024 * 1024) } });
  await assert.rejects(fetchGeoJson('https://ejemplo.es/data.json'), /30 MiB/);
  await assert.rejects(fetchGeoJson('https://ejemplo.es/wms?service=WMS'), /Fuentes ráster/);
});

test('IndexedDB conserva configuración e importación al abrir otro cliente y elimina solo imports', async () => {
  const factory = new IDBFactory();
  const storage = createLayerStorage('browser', factory);
  assert.deepEqual(await storage.load(), { configs: null, imports: [] });
  const imports = sample();
  const configs = [...defaultLayers, ...imports.map(item => item.config)];
  await storage.add(imports, configs);
  const restored = createLayerStorage('browser', factory);
  assert.deepEqual((await restored.load()).imports[0].data, imports[0].data);
  await restored.saveConfigs(configs.map(config => ({ ...config, opacity: 0.25 })));
  assert.equal((await storage.load()).configs[0].opacity, 0.25);
  await restored.remove(imports[0].config.id, defaultLayers);
  assert.deepEqual((await storage.load()).imports, []);
  assert.deepEqual((await storage.load()).configs, defaultLayers);
});

test('Importación remota cancela una conexión o un cuerpo bloqueados por timeout', async t => {
  const fetcher = t.mock.method(globalThis, 'fetch', async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
  }));
  await assert.rejects(fetchGeoJson('https://ejemplo.es/data.json', undefined, 5), /tardado demasiado/);
  let cancelled = false;
  fetcher.mock.mockImplementation(async () => new Response(new ReadableStream({ cancel() { cancelled = true; } })));
  await assert.rejects(fetchGeoJson('https://ejemplo.es/data.json', undefined, 5), /tardado demasiado/);
  assert.equal(cancelled, true);
});

test('Abortar una importación conserva AbortError y permite intentarlo otra vez', async t => {
  const controller = new AbortController();
  controller.abort();
  const fetcher = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(collection(feature('Point', [0, 0])))));
  await assert.rejects(fetchGeoJson('https://ejemplo.es/data.json', controller.signal), { name: 'AbortError' });
  assert.equal(fetcher.mock.callCount(), 0);
  assert.equal((await fetchGeoJson('https://ejemplo.es/data.json')).features.length, 1);
});

test('IndexedDB revierte toda la importación si un ID repetido aborta la transacción', async () => {
  const storage = createLayerStorage('browser', new IDBFactory());
  const imports = sample();
  await storage.add(imports, defaultLayers);
  const another = prepareImport(collection(feature('Point', [0, 0])), 'Otra', 'EPSG:4326', 'other');
  await assert.rejects(storage.add([...another, ...imports], []), /No se pudo guardar/);
  const stored = await storage.load();
  assert.equal(stored.imports.length, 1);
  assert.equal(stored.configs.length, 3);
});

test('Navegador sin IndexedDB devuelve un error y no finge persistencia', async () => {
  const storage = createLayerStorage('browser', undefined);
  await assert.rejects(storage.saveConfigs(defaultLayers), /El cambio no se ha aplicado/);
  await assert.rejects(storage.load(), /no está disponible/);
});

test('Los estilos originales de SQLite prevalecen en modo local; Pages recupera su propia copia', () => {
  const changed = defaultLayers.map(config => ({ ...config, name: 'Preferencia local', opacity: 0.15 }));
  const saved = { configs: changed, imports: sample() };
  const server = mergeLayerConfigs(defaultLayers, saved, 'server');
  const browser = mergeLayerConfigs(defaultLayers, saved, 'browser');
  assert.equal(server.find(config => config.id === 'points').name, 'Puntos · Chile');
  assert.equal(browser.find(config => config.id === 'points').opacity, 0.15);
  assert.equal(server.length, 4);
  assert.equal(browser.length, 4);
});
