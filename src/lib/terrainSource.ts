import { load, parse } from '@loaders.gl/core';
import { TerrainLoader } from '@loaders.gl/terrain';
import type { LayerProps } from '@deck.gl/core';

export type TerrainTileIndex = { z: number; x: number; y: number };
export type TerrainTileData = {
  index: TerrainTileIndex;
  buffer: ArrayBuffer;
  mimeType: string;
};
export type TerrainFetchOptions = {
  fetch?: typeof globalThis.fetch;
  urlForTile?: (index: TerrainTileIndex) => string;
  label?: string;
  maxConcurrency?: number;
  cacheSize?: number;
  maxCacheBytes?: number;
  timeoutMs?: number;
};

const MAPTERHORN = 'https://tiles.mapterhorn.com';
const abortReason = (signal?: AbortSignal): Error => signal?.reason instanceof Error
  ? signal.reason : new DOMException('Carga del relieve cancelada.', 'AbortError');

function checkIndex(index: TerrainTileIndex) {
  const { x, y, z } = index;
  if (!Number.isInteger(z) || z < 0 || z > 24 || !Number.isInteger(x) || !Number.isInteger(y)
    || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) throw new Error('Índice de tesela de relieve inválido.');
}

export function terrainParent(index: TerrainTileIndex): TerrainTileIndex | null {
  checkIndex(index);
  return index.z ? { z: index.z - 1, x: Math.floor(index.x / 2), y: Math.floor(index.y / 2) } : null;
}

// Pixel coordinates are north-to-south (XYZ). Only the requested descendant's
// quadrant is used: stretching the complete parent would move mountains.
export function terrainCrop(requested: TerrainTileIndex, ancestor: TerrainTileIndex, size = 512) {
  checkIndex(requested); checkIndex(ancestor);
  const factor = 2 ** (requested.z - ancestor.z);
  if (factor < 1 || Math.floor(requested.x / factor) !== ancestor.x
    || Math.floor(requested.y / factor) !== ancestor.y || !Number.isFinite(size) || size <= 0) {
    throw new Error('La tesela disponible no es un antecesor de la solicitada.');
  }
  return { x: (requested.x % factor) * size / factor, y: (requested.y % factor) * size / factor,
    width: size / factor, height: size / factor };
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const onAbort = () => { cleanup(); reject(abortReason(signal)); };
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
  });
}

type Cached = { buffer: ArrayBuffer | null; mimeType: string; expires: number };
type Pending = { controller: AbortController; promise: Promise<Cached>; users: number; done: boolean };

// This part deliberately knows nothing about image decoding, so network,
// fallback, cancellation and cache behavior can be tested with ordinary bytes.
export function createTerrainTileFetcher(options: TerrainFetchOptions = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const urlForTile = options.urlForTile ?? ((index: TerrainTileIndex) => `${MAPTERHORN}/${index.z}/${index.x}/${index.y}.webp`);
  const label = options.label ?? 'relieve';
  const concurrency = Math.min(2, Math.max(1, Math.floor(options.maxConcurrency ?? 2)));
  const cacheSize = Math.min(64, Math.max(0, Math.floor(options.cacheSize ?? 32)));
  const maxCacheBytes = Math.max(0, options.maxCacheBytes ?? 16 * 1024 * 1024);
  const timeoutMs = Math.max(1, options.timeoutMs ?? 12000);
  const cache = new Map<string, Cached>();
  const pending = new Map<string, Pending>();
  const queue: Array<() => void> = [];
  let active = 0, cacheBytes = 0;

  function remember(url: string, value: Cached) {
    if (!cacheSize || (value.buffer?.byteLength ?? 0) > maxCacheBytes) return;
    const previous = cache.get(url);
    if (previous) { cacheBytes -= previous.buffer?.byteLength ?? 0; cache.delete(url); }
    cache.set(url, value); cacheBytes += value.buffer?.byteLength ?? 0;
    while (cache.size > cacheSize || cacheBytes > maxCacheBytes) {
      const oldest = cache.keys().next().value!;
      cacheBytes -= cache.get(oldest)!.buffer?.byteLength ?? 0;
      cache.delete(oldest);
    }
  }

  function pump() {
    while (active < concurrency && queue.length) { active++; queue.shift()!(); }
  }

  function start(url: string): Pending {
    const controller = new AbortController();
    let resolve!: (value: Cached) => void, reject!: (error: unknown) => void;
    const promise = new Promise<Cached>((ok, fail) => { resolve = ok; reject = fail; });
    const entry: Pending = { controller, promise, users: 0, done: false };
    pending.set(url, entry);
    queue.push(() => {
      const timeout = new AbortController();
      const signal = AbortSignal.any([controller.signal, timeout.signal]);
      const timer = setTimeout(() => timeout.abort(new DOMException(`La fuente de ${label} no respondió a tiempo.`, 'TimeoutError')), timeoutMs);
      const run = async () => {
        if (signal.aborted) throw abortReason(signal);
        const response = await abortable(fetchImpl(url, { signal }), signal);
        if (response.status === 404) return { buffer: null, mimeType: '', expires: Date.now() + 60000 };
        if (!response.ok) throw new Error(`No se pudo cargar la fuente de ${label} (HTTP ${response.status}).`);
        const buffer = await abortable(response.arrayBuffer(), signal);
        return { buffer, mimeType: response.headers.get('Content-Type') ?? 'image/webp', expires: 0 };
      };
      run().then(value => { entry.done = true; remember(url, value); resolve(value); },
        error => { entry.done = true; reject(error); }).finally(() => {
        clearTimeout(timer);
        if (pending.get(url) === entry) pending.delete(url);
        active--; pump();
      });
    });
    // Let the first subscriber register before a queued job starts.
    queueMicrotask(pump);
    return entry;
  }

  async function read(url: string, signal?: AbortSignal): Promise<Cached> {
    if (signal?.aborted) throw abortReason(signal);
    const cached = cache.get(url);
    if (cached && (!cached.expires || cached.expires > Date.now())) {
      cache.delete(url); cache.set(url, cached);
      return { ...cached, buffer: cached.buffer?.slice(0) ?? null };
    }
    if (cached) { cacheBytes -= cached.buffer?.byteLength ?? 0; cache.delete(url); }
    let entry = pending.get(url);
    if (!entry || entry.controller.signal.aborted) entry = start(url);
    const shared = entry;
    shared.users++;
    return new Promise((resolve, reject) => {
      let finished = false;
      const finish = (callback: () => void) => {
        if (finished) return;
        finished = true; signal?.removeEventListener('abort', onAbort); shared.users--;
        if (!shared.users && !shared.done) shared.controller.abort();
        callback();
      };
      const onAbort = () => finish(() => reject(abortReason(signal)));
      signal?.addEventListener('abort', onAbort, { once: true });
      shared.promise.then(value => finish(() => resolve({ ...value, buffer: value.buffer?.slice(0) ?? null })),
        error => finish(() => reject(error)));
      if (signal?.aborted) onAbort();
    });
  }

  return async (requested: TerrainTileIndex, signal?: AbortSignal): Promise<TerrainTileData> => {
    checkIndex(requested);
    let index: TerrainTileIndex | null = requested;
    // At most requested.z + 1 requests, always within the same geographic area.
    while (index) {
      const data = await read(urlForTile(index), signal);
      if (data.buffer) return { index, buffer: data.buffer, mimeType: data.mimeType };
      index = terrainParent(index);
    }
    throw new Error(label === 'relieve' ? 'No hay datos de elevación disponibles para esta zona.'
      : `No hay datos disponibles para ${label} en esta zona.`);
  };
}

async function cropTerrainImage(data: TerrainTileData, requested: TerrainTileIndex, signal?: AbortSignal): Promise<ArrayBuffer> {
  if (signal?.aborted) throw abortReason(signal);
  const bitmap = await createImageBitmap(new Blob([data.buffer], { type: data.mimeType }), {
    colorSpaceConversion: 'none', premultiplyAlpha: 'none'
  });
  try {
    const crop = terrainCrop(requested, data.index, bitmap.width);
    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(512, 512) : document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    if (!context) throw new Error('El navegador no puede preparar el relieve.');
    // RGB encodes metres, not colors: smoothing RGB across a channel carry
    // invents heights. Nearest-neighbor preserves the actual available samples.
    context.imageSmoothingEnabled = false;
    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, 512, 512);
    const blob = 'convertToBlob' in canvas ? await canvas.convertToBlob({ type: 'image/png' })
      : await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value)
        : reject(new Error('No se pudo preparar la tesela de relieve.')), 'image/png'));
    if (signal?.aborted) throw abortReason(signal);
    return blob.arrayBuffer();
  } finally { bitmap.close(); }
}

export function createTerrainFetch(options: TerrainFetchOptions = {}): NonNullable<LayerProps['fetch']> {
  const fetchTile = createTerrainTileFetcher(options);
  return async (url, context) => {
    const loadOptions = context.loadOptions ?? context.layer.getLoadOptions() ?? {};
    const match = /^https:\/\/tiles\.mapterhorn\.com\/(\d+)\/(\d+)\/(\d+)\.webp(?:\?.*)?$/.exec(url);
    if (context.propName !== 'elevationData' || !match) {
      return load(url, context.loaders ?? context.layer.props.loaders ?? [TerrainLoader], {
        ...loadOptions, core: { ...loadOptions.core, fetch: { ...loadOptions.core?.fetch, signal: context.signal } }
      });
    }
    const requested = { z: Number(match[1]), x: Number(match[2]), y: Number(match[3]) };
    const data = await fetchTile(requested, context.signal);
    const buffer = data.index.z === requested.z ? data.buffer : await cropTerrainImage(data, requested, context.signal);
    if (context.signal?.aborted) throw abortReason(context.signal);
    // Keep the original child's bounds, decoder, mesh tolerance and bundled
    // worker URL. The cached bytes were cloned, so worker transfers are safe.
    const mesh = await parse(buffer, TerrainLoader, { ...loadOptions,
      imagebitmap: { ...loadOptions.imagebitmap, colorSpaceConversion: 'none', premultiplyAlpha: 'none' } });
    if (context.signal?.aborted) throw abortReason(context.signal);
    return mesh;
  };
}
