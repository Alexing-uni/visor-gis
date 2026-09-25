import type { Collection, Kind, LayerConfig } from '../types.ts';
import { canonicalCrs, normalize } from './geojson.ts';

export type ImportedLayer = { config: LayerConfig; data: Collection };
export const MAX_IMPORT_BYTES = 30 * 1024 * 1024;
const kindOf = (type: string): Kind => type.includes('Point') ? 'point' : type.includes('LineString') ? 'line' : 'polygon';
const labels = { point: 'puntos', line: 'líneas', polygon: 'polígonos' };
const colors = { point: '#e85d04', line: '#007f86', polygon: '#7b2cbf' };

export function classifyImportUrl(value: string): 'geojson' | 'wms' | 'wmts' | 'unknown' {
  const url = importUrl(value);
  const service = [...url.searchParams].find(([key]) => key.toLowerCase() === 'service')?.[1].toLowerCase();
  if (service === 'wmts' || /(?:^|\/)wmts(?:\/|$)/i.test(url.pathname)) return 'wmts';
  if (service === 'wms' || /(?:^|\/)wms(?:\/|$)/i.test(url.pathname)) return 'wms';
  return /\.(geojson|json)$/i.test(url.pathname) ? 'geojson' : 'unknown';
}
export function importUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('Introduce una URL completa que empiece por https:// o http://.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Solo se admiten enlaces HTTP(S) sin credenciales.');
  return url;
}
export function parseGeoJson(text: string): unknown {
  text = text.replace(/^\uFEFF/, '');
  if (/^\s*</.test(text)) throw new Error('El enlace devuelve una página web o un XML. Necesitas el archivo GeoJSON, no la dirección de otro visor.');
  try { return JSON.parse(text); } catch { throw new Error('El contenido no es JSON válido. Utiliza un archivo GeoJSON o su enlace directo.'); }
}

export function prepareImport(raw: unknown, name: string, crs = 'EPSG:4326', idPrefix = `import-${crypto.randomUUID()}`): ImportedLayer[] {
  const data = normalize(raw, canonicalCrs(crs));
  if (!data.features.length) throw new Error('El GeoJSON está vacío.');
  const kinds: Kind[] = ['point', 'line', 'polygon'];
  const groups = kinds.map(kind => ({ kind, features: data.features.filter(feature => kindOf(feature.geometry.type) === kind) })).filter(group => group.features.length);
  const title = name.trim().slice(0, 80) || 'Capa importada';
  return groups.map(({ kind, features }, index) => ({
    config: { id: `${idPrefix}-${kind}`, name: groups.length > 1 ? `${title} · ${labels[kind]}` : title, kind,
      source: 'browser:import', crs: 'EPSG:4326', visible: true, stroke: colors[kind], fill: colors[kind],
      width: 2, radius: 5, opacity: kind === 'polygon' ? 0.45 : 0.9, sort_order: index },
    data: { type: 'FeatureCollection', features },
  }));
}

export async function fetchGeoJson(url: string, signal?: AbortSignal, timeoutMs = 30_000): Promise<unknown> {
  const endpoint = importUrl(url);
  const kind = classifyImportUrl(endpoint.href);
  if (kind === 'wms' || kind === 'wmts') throw new Error(`Este enlace es un servicio ${kind.toUpperCase()}. Regístralo en «Fuentes ráster»; no contiene entidades GeoJSON.`);
  if (signal?.aborted) throw signal.reason || new DOMException('Solicitud cancelada', 'AbortError');
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(signal?.reason);
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(endpoint.href, { signal: controller.signal, credentials: 'omit' });
    if (!response.ok) throw new Error(`El servidor respondió HTTP ${response.status}.`);
    const type = response.headers.get('content-type') || '';
    if (/text\/html|application\/xhtml\+xml/i.test(type)) throw new Error('El enlace es una página web con un visor. Usa la URL directa de sus datos GeoJSON.');
    if (Number(response.headers.get('content-length')) > MAX_IMPORT_BYTES) throw new Error('El archivo supera el límite de 30 MiB.');
    if (!response.body) throw new Error('La respuesta está vacía.');
    const reader = response.body.getReader();
    const cancelRead = () => { void reader.cancel().catch(() => {}); };
    controller.signal.addEventListener('abort', cancelRead, { once: true });
    const decoder = new TextDecoder();
    let size = 0, text = '';
    try {
      while (true) {
        if (controller.signal.aborted) throw controller.signal.reason;
        const { value, done } = await reader.read();
        if (controller.signal.aborted) throw controller.signal.reason;
        if (done) break;
        size += value.byteLength;
        if (size > MAX_IMPORT_BYTES) { await reader.cancel(); throw new Error('El archivo supera el límite de 30 MiB.'); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { controller.signal.removeEventListener('abort', cancelRead); reader.releaseLock(); }
    return parseGeoJson(text);
  } catch (error) {
    if (signal?.aborted) throw signal.reason || new DOMException('Solicitud cancelada', 'AbortError');
    if (timedOut) throw new Error('La descarga ha tardado demasiado. Reintenta o descarga el GeoJSON e impórtalo como archivo.');
    if (error instanceof TypeError) throw new Error('No se pudo descargar el archivo. Comprueba la URL, HTTPS, la conexión y si el servidor permite CORS; también puedes descargarlo e importarlo como archivo.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
