import test from 'node:test';
import assert from 'node:assert/strict';
import { createSatelliteFetcher } from '../src/lib/satelliteSource.ts';

const response = (status = 200) => new Response(new Uint8Array([1, 2, 3]), {
  status, headers: { 'Content-Type': 'image/webp' }
});
const bitmap = () => ({ width: 512, height: 512, closed: 0, close() { this.closed++; } });

function useBitmapAPI(t, create, canvas) {
  const previousBitmap = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
  const previousCanvas = Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas');
  Object.defineProperty(globalThis, 'createImageBitmap', { value: create, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'OffscreenCanvas', { value: canvas, configurable: true, writable: true });
  t.after(() => {
    if (previousBitmap) Object.defineProperty(globalThis, 'createImageBitmap', previousBitmap);
    else delete globalThis.createImageBitmap;
    if (previousCanvas) Object.defineProperty(globalThis, 'OffscreenCanvas', previousCanvas);
    else delete globalThis.OffscreenCanvas;
  });
}

test('Satélite: imagen disponible se entrega sin recorte y su propietario decide cuándo cerrarla', async t => {
  const image = bitmap(), calls = [];
  useBitmapAPI(t, async blob => { assert.equal(blob.type, 'image/webp'); return image; }, undefined);
  const fetchSatellite = createSatelliteFetcher({ fetch: async url => { calls.push(url); return response(); } });
  assert.equal(await fetchSatellite({ z: 12, x: 1981, y: 1499 }), image);
  assert.equal(image.closed, 0);
  assert.deepEqual(calls, ['https://tiles.versatiles.org/tiles/satellite/12/1981/1499']);
});

test('Satélite: una zona sin alta resolución recorta su cuadrante del padre y activa suavizado de colores', async t => {
  const source = bitmap(), result = bitmap(), draw = [];
  const context = { imageSmoothingEnabled: false, imageSmoothingQuality: 'low', drawImage: (...args) => draw.push(args) };
  useBitmapAPI(t, async () => source, class {
    constructor(width, height) { assert.equal(width, 512); assert.equal(height, 512); }
    getContext(type) { assert.equal(type, '2d'); return context; }
    transferToImageBitmap() { return result; }
  });
  const calls = [];
  const fetchSatellite = createSatelliteFetcher({ fetch: async url => {
    calls.push(url); return response(url.endsWith('/12/1981/1499') ? 200 : 404);
  } });
  assert.equal(await fetchSatellite({ z: 14, x: 7925, y: 5997 }), result);
  assert.deepEqual(calls.map(url => new URL(url).pathname),
    ['/tiles/satellite/14/7925/5997', '/tiles/satellite/13/3962/2998', '/tiles/satellite/12/1981/1499']);
  assert.deepEqual(draw[0].slice(1), [128, 128, 128, 128, 0, 0, 512, 512]);
  assert.equal(context.imageSmoothingEnabled, true);
  assert.equal(context.imageSmoothingQuality, 'high');
  assert.equal(source.closed, 1);
  assert.equal(result.closed, 0);
});

test('Satélite: cancelar durante la decodificación cierra la imagen disponible', async t => {
  const image = bitmap(), cancel = new AbortController();
  useBitmapAPI(t, async () => { cancel.abort(); return image; }, undefined);
  const fetchSatellite = createSatelliteFetcher({ fetch: async () => response() });
  await assert.rejects(fetchSatellite({ z: 12, x: 1981, y: 1499 }, cancel.signal), { name: 'AbortError' });
  assert.equal(image.closed, 1);
});

test('Satélite: cancelar el recorte cierra tanto la imagen de origen como el resultado', async t => {
  const source = bitmap(), result = bitmap(), cancel = new AbortController();
  useBitmapAPI(t, async () => source, class {
    getContext() { return { drawImage() {} }; }
    transferToImageBitmap() { cancel.abort(); return result; }
  });
  const fetchSatellite = createSatelliteFetcher({ fetch: async url => response(url.endsWith('/12/1981/1499') ? 200 : 404) });
  await assert.rejects(fetchSatellite({ z: 13, x: 3962, y: 2998 }, cancel.signal), { name: 'AbortError' });
  assert.equal(source.closed, 1);
  assert.equal(result.closed, 1);
});

test('Satélite: error de servicio conserva HTTP y no intenta decodificar ni ocultarlo con otra imagen', async t => {
  let calls = 0, decodes = 0;
  useBitmapAPI(t, async () => { decodes++; return bitmap(); }, undefined);
  const fetchSatellite = createSatelliteFetcher({ fetch: async () => { calls++; return response(503); } });
  await assert.rejects(fetchSatellite({ z: 12, x: 1981, y: 1499 }), /las imágenes del fondo.*HTTP 503/);
  assert.equal(calls, 1);
  assert.equal(decodes, 0);
});
