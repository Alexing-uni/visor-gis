import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoutingClient, parseRouteResponse, parseSearchResponse, instructionForStep, formatDistance, formatDuration } from '../src/lib/routing.ts';

const origin = { label: 'Oviedo', coordinates: [-5.844, 43.362] };
const destination = { label: 'Gijón', coordinates: [-5.661, 43.535] };
const fixture = () => ({ code: 'Ok', waypoints: [
  { location: [-5.844, 43.362], distance: 4, name: 'Origen' },
  { location: [-5.661, 43.535], distance: 8, name: 'Destino' },
], routes: [{ distance: 31000, duration: 1800, geometry: { type: 'LineString', coordinates: [[-5.844, 43.362], [-5.78, 43.40], [-5.661, 43.535]] }, legs: [{ steps: [
  { distance: 100, duration: 20, name: 'Calle de prueba', maneuver: { type: 'depart', location: [-5.844, 43.362] } },
  { distance: 30900, duration: 1780, name: 'A-66', maneuver: { type: 'turn', modifier: 'right', location: [-5.78, 43.40] } },
  { distance: 0, duration: 0, name: '', maneuver: { type: 'arrive', location: [-5.661, 43.535] } },
] }] }] });
const photonFixture = () => ({ type: 'FeatureCollection', features: [
  { type: 'Feature', geometry: { type: 'Point', coordinates: [-5.84, 43.36] }, properties: { name: 'Oviedo', city: 'Oviedo', country: 'España' } },
] });
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

test('Una ruta conserva geometría real y unidades; traduce indicaciones y formatea resumen', () => {
  const result = parseRouteResponse(fixture());
  assert.equal(result.geometry.coordinates.length, 3);
  assert.equal(result.distance, 31000);
  assert.equal(result.duration, 1800);
  assert.equal(result.profile, 'driving');
  assert.match(result.steps[1].instruction, /Gira a la derecha por A-66/);
  assert.match(instructionForStep({ maneuver: { type: 'roundabout', exit: 3 } }), /salida 3/);
  assert.equal(formatDistance(120), '120 m');
  assert.equal(formatDistance(1200), '1,2 km');
  assert.equal(formatDuration(7260), '2 h 1 min');
});

test('Sin ruta y sin acceso se distinguen sin inventar líneas rectas', () => {
  assert.throws(() => parseRouteResponse({ code: 'NoRoute' }), /No existe una ruta/);
  assert.throws(() => parseRouteResponse({ code: 'NoSegment' }), /menos de 1 km/);
  const far = fixture(); far.waypoints[1].distance = 1001;
  assert.throws(() => parseRouteResponse(far), /más de 1 km/);
  const invalid = fixture(); invalid.routes[0].geometry.coordinates[0] = [NaN, 43];
  assert.throws(() => parseRouteResponse(invalid), /inválida/);
  const incomplete = fixture(); incomplete.routes[0].legs = [];
  assert.throws(() => parseRouteResponse(incomplete), /indicaciones/);
});

test('Búsqueda Photon elimina resultados inválidos y duplica ni ciudad ni nombre', () => {
  const data = photonFixture();
  data.features.push({ geometry: { type: 'Point', coordinates: [200, 0] }, properties: { name: 'Inválido' } });
  assert.deepEqual(parseSearchResponse(data), [{ label: 'Oviedo, España', coordinates: [-5.84, 43.36] }]);
  assert.deepEqual(parseSearchResponse({ features: [] }), []);
  assert.throws(() => parseSearchResponse('<html>'), /inválida/);
});

test('OSRM recibe driving, pasos y radio limitado; la caché evita solicitudes repetidas', async () => {
  const requests = [];
  const client = createRoutingClient({ minIntervalMs: 0, fetcher: async (url, init) => { requests.push({ url: new URL(url), init }); return response(fixture()); } });
  const result = await client.route(origin, destination);
  result.geometry.coordinates[0][0] = 0;
  const cached = await client.route(origin, destination);
  assert.equal(cached.geometry.coordinates[0][0], -5.844);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url.pathname, /\/route\/v1\/driving\//);
  assert.equal(requests[0].url.searchParams.get('steps'), 'true');
  assert.equal(requests[0].url.searchParams.get('radiuses'), '1000;1000');
  assert.equal(requests[0].url.searchParams.get('geometries'), 'geojson');
  assert.equal(requests[0].init.credentials, 'omit');
});

test('Búsqueda se normaliza en caché; entradas cortas y coordenadas inválidas no llegan al servicio', async () => {
  let calls = 0;
  const client = createRoutingClient({ minIntervalMs: 0, fetcher: async () => { calls++; return response(photonFixture()); } });
  await client.search(' Oviedo ');
  await client.search('OVIEDO');
  await assert.rejects(client.search('ab'), /tres caracteres/);
  await assert.rejects(client.route(origin, origin), /diferentes/);
  await assert.rejects(client.route({ ...origin, coordinates: [181, 0] }, destination), /no son válidas/);
  assert.equal(calls, 1);
});

test('Errores OSRM HTTP 400, cuota, disponibilidad y JSON se comunican explícitamente', async () => {
  const make = (value, status) => createRoutingClient({ minIntervalMs: 0, fetcher: async () => response(value, status) });
  await assert.rejects(make({ code: 'NoSegment' }, 400).route(origin, destination), /carreteras/);
  await assert.rejects(make({}, 429).search('Oviedo'), /limitado/);
  await assert.rejects(make({}, 503).route(origin, destination), /HTTP 503/);
  await assert.rejects(createRoutingClient({ fetcher: async () => new Response('<html>') }).search('Oviedo'), /JSON válido/);
});

test('Tiempo límite y cancelación descartan respuestas sin confundirlos con rutas válidas', async () => {
  const fetcher = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
  });
  const client = createRoutingClient({ minIntervalMs: 0, timeoutMs: 15, fetcher });
  await assert.rejects(client.route(origin, destination), /tardado demasiado/);
  const cancellation = new AbortController(); cancellation.abort();
  await assert.rejects(client.search('Oviedo', cancellation.signal), { name: 'AbortError' });
  const active = new AbortController();
  const request = client.search('Oviedo', active.signal);
  setTimeout(() => active.abort(), 4);
  await assert.rejects(request, { name: 'AbortError' });
});

test('Solicitudes consecutivas al mismo proveedor quedan espaciadas', async () => {
  const started = [];
  const client = createRoutingClient({ minIntervalMs: 35, fetcher: async () => { started.push(Date.now()); return response(photonFixture()); } });
  await Promise.all([client.search('Oviedo'), client.search('Gijón'), client.search('Avilés')]);
  assert.equal(started.length, 3);
  assert.ok(started[1] - started[0] >= 30);
  assert.ok(started[2] - started[1] >= 30);
});
