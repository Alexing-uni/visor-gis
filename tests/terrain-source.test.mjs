import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createTerrainTileFetcher, terrainParent, terrainCrop } from '../src/lib/terrainSource.ts';

const response = (status = 200, bytes = [128, 42, 12]) => new Response(new Uint8Array(bytes), {
  status, headers: { 'Content-Type': 'image/webp' }
});

test('Relieve: padres XYZ y recorte conservan el cuadrante geográfico solicitado', () => {
  const child = { z: 16, x: 31703, y: 23990 }, parent = { z: 14, x: 7925, y: 5997 };
  assert.deepEqual(terrainParent(child), { z: 15, x: 15851, y: 11995 });
  assert.deepEqual(terrainCrop(child, parent), { x: 384, y: 256, width: 128, height: 128 });
  assert.deepEqual(terrainCrop({ z: 2, x: 2, y: 1 }, { z: 0, x: 0, y: 0 }),
    { x: 256, y: 128, width: 128, height: 128 });
  assert.deepEqual(terrainCrop(parent, parent), { x: 0, y: 0, width: 512, height: 512 });
  assert.equal(terrainParent({ z: 0, x: 0, y: 0 }), null);
  assert.throws(() => terrainCrop(child, { ...parent, x: parent.x + 1 }), /antecesor/);
  assert.throws(() => terrainParent({ z: 3, x: 8, y: 1 }), /inválido/);
});

test('Relieve: 404 busca padres correctos y reutiliza los bytes del padre para otro hijo', async () => {
  const calls = [];
  const fetchTile = createTerrainTileFetcher({ fetch: async url => {
    calls.push(url);
    return response(url.endsWith('/2/2/1.webp') ? 200 : 404);
  } });
  const first = await fetchTile({ z: 4, x: 11, y: 6 });
  assert.deepEqual(first.index, { z: 2, x: 2, y: 1 });
  assert.deepEqual(calls.map(url => new URL(url).pathname), ['/4/11/6.webp', '/3/5/3.webp', '/2/2/1.webp']);
  assert.deepEqual([...new Uint8Array(first.buffer)], [128, 42, 12]);
  const second = await fetchTile({ z: 4, x: 10, y: 7 });
  assert.deepEqual(second.index, first.index);
  assert.equal(calls.length, 4, 'Only the different child is fetched; missing/shared parents are cached.');
  assert.notDeepEqual(terrainCrop({ z: 4, x: 11, y: 6 }, first.index), terrainCrop({ z: 4, x: 10, y: 7 }, second.index));
});

test('Relieve: error HTTP 503 se comunica sin sustituir silenciosamente los datos', async () => {
  const calls = [];
  const fetchTile = createTerrainTileFetcher({ fetch: async url => { calls.push(url); return response(503); } });
  await assert.rejects(fetchTile({ z: 4, x: 11, y: 6 }), /HTTP 503/);
  assert.equal(calls.length, 1);
});

test('Relieve: falta completa de cobertura termina en z0 sin inventar altura', async () => {
  const calls = [];
  const fetchTile = createTerrainTileFetcher({ fetch: async url => { calls.push(url); return response(404); } });
  await assert.rejects(fetchTile({ z: 2, x: 2, y: 1 }), /No hay datos de elevación/);
  assert.deepEqual(calls.map(url => new URL(url).pathname), ['/2/2/1.webp', '/1/1/0.webp', '/0/0/0.webp']);
});

test('Relieve: transferir al worker los bytes de un consumidor no vacía la caché', async () => {
  let calls = 0;
  const fetchTile = createTerrainTileFetcher({ fetch: async () => { calls++; return response(); } });
  const index = { z: 4, x: 11, y: 6 };
  const first = await fetchTile(index);
  structuredClone(first.buffer, { transfer: [first.buffer] });
  assert.equal(first.buffer.byteLength, 0);
  const second = await fetchTile(index);
  assert.deepEqual([...new Uint8Array(second.buffer)], [128, 42, 12]);
  assert.equal(calls, 1);
});

test('Relieve: dos consumidores comparten descarga y cancelar uno conserva al otro', async () => {
  let calls = 0, finish, requestSignal;
  const fetchTile = createTerrainTileFetcher({ fetch: async (_url, { signal }) => {
    calls++; requestSignal = signal;
    return new Promise(resolve => { finish = () => resolve(response()); });
  } });
  const cancel = new AbortController(), index = { z: 4, x: 11, y: 6 };
  const first = fetchTile(index, cancel.signal), second = fetchTile(index);
  const cancelled = assert.rejects(first, { name: 'AbortError' });
  await setImmediate();
  cancel.abort();
  await cancelled;
  assert.equal(requestSignal.aborted, false);
  finish();
  assert.deepEqual([...new Uint8Array((await second).buffer)], [128, 42, 12]);
  assert.equal(calls, 1);
});

test('Relieve: cola limita la red a dos solicitudes y no descarga un trabajo cancelado', async () => {
  let active = 0, highest = 0;
  const calls = [], releases = [];
  const fetchTile = createTerrainTileFetcher({ maxConcurrency: 2, fetch: async url => {
    calls.push(url); active++; highest = Math.max(highest, active);
    return new Promise(resolve => releases.push(() => { active--; resolve(response()); }));
  } });
  const cancel = new AbortController();
  const jobs = [fetchTile({ z: 3, x: 1, y: 1 }), fetchTile({ z: 3, x: 2, y: 1 }),
    fetchTile({ z: 3, x: 3, y: 1 }, cancel.signal), fetchTile({ z: 3, x: 4, y: 1 })];
  const cancelled = assert.rejects(jobs[2], { name: 'AbortError' });
  await setImmediate();
  assert.equal(calls.length, 2);
  cancel.abort(); await cancelled;
  releases.shift()(); releases.shift()();
  await setImmediate();
  assert.equal(calls.length, 3);
  releases.shift()();
  await Promise.all([jobs[0], jobs[1], jobs[3]]);
  assert.equal(highest, 2);
  assert.equal(calls.some(url => url.endsWith('/3/3/1.webp')), false);
});

test('Relieve: timeout cancela la descarga y no se confunde con ausencia de cobertura', async () => {
  let requestSignal, calls = 0;
  const fetchTile = createTerrainTileFetcher({ timeoutMs: 20, fetch: async (_url, { signal }) => {
    calls++; requestSignal = signal;
    return new Promise(() => {});
  } });
  await assert.rejects(fetchTile({ z: 4, x: 11, y: 6 }), { name: 'TimeoutError' });
  assert.equal(requestSignal.aborted, true);
  assert.equal(calls, 1);
});

test('Relieve: cancelar el último consumidor aborta la red y permite volver a solicitar la tesela', async () => {
  let calls = 0, requestSignal;
  const fetchTile = createTerrainTileFetcher({ fetch: async (_url, { signal }) => {
    calls++; requestSignal = signal;
    return calls === 1 ? new Promise(() => {}) : response();
  } });
  const cancel = new AbortController(), index = { z: 4, x: 11, y: 6 };
  const first = fetchTile(index, cancel.signal);
  const cancelled = assert.rejects(first, { name: 'AbortError' });
  await setImmediate(); cancel.abort(); await cancelled;
  assert.equal(requestSignal.aborted, true);
  const second = await fetchTile(index);
  assert.deepEqual([...new Uint8Array(second.buffer)], [128, 42, 12]);
  assert.equal(calls, 2);
});

test('Relieve: caché LRU respeta tanto número de teselas como bytes', async () => {
  for (const limits of [{ cacheSize: 1 }, { cacheSize: 32, maxCacheBytes: 3 }]) {
    let calls = 0;
    const fetchTile = createTerrainTileFetcher({ ...limits, fetch: async () => { calls++; return response(); } });
    await fetchTile({ z: 3, x: 1, y: 1 });
    await fetchTile({ z: 3, x: 2, y: 1 });
    await fetchTile({ z: 3, x: 1, y: 1 });
    assert.equal(calls, 3);
  }
});
