// Manual external-service checks; deliberately excluded from npm test and CI.
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { officialSources, tileUrl } from '../src/lib/raster.ts';

const origin = 'https://example.github.io';
const checks = [];
const bounds = [-5.86, 43.35, -5.81, 43.39];
const headers = { Origin: origin, 'User-Agent': 'VisorGIS/0.4 manual-source-check' };

async function check(name, url, format) {
  const result = { name, url, format, date: new Date().toISOString(), ok: false };
  checks.push(result);
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    Object.assign(result, { status: response.status, contentType: response.headers.get('content-type'), cors: response.headers.get('access-control-allow-origin'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    let body;
    if (format === 'png') {
      result.pngSignature = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      if (result.pngSignature) Object.assign(result, { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
      result.validFormat = result.pngSignature && result.width === 256 && result.height === 256 && result.contentType?.startsWith('image/png');
    } else if (format === 'json') {
      body = JSON.parse(bytes.toString());
      result.validFormat = body && typeof body === 'object';
    } else if (format === 'capabilities') {
      body = bytes.toString();
      result.validFormat = /<(?:WMS_Capabilities|WMT_MS_Capabilities)[\s>]/.test(body);
      result.supports3857 = body.includes('EPSG:3857');
      result.layerFound = name.includes('PNOA') ? body.includes('OI.OrthoimageCoverage') : body.includes('HY.Network');
      result.serviceTitle = body.match(/<Service>[\s\S]*?<Title>(.*?)<\/Title>/)?.[1];
      result.accessConstraints = body.match(/<AccessConstraints>([\s\S]*?)<\/AccessConstraints>/)?.[1]?.replace(/\s+/g, ' ').trim();
    } else {
      result.validFormat = bytes.length > 0 && !bytes.subarray(0, 100).toString().includes('<html');
    }
    result.ok = response.ok && !!result.validFormat && (result.cors === '*' || result.cors === origin);
    if (!result.validFormat) result.bodyPreview = bytes.subarray(0, 180).toString();
    return body;
  } catch (error) { result.error = error.message; }
}

for (const source of officialSources) {
  const label = source.id === 'pnoa' ? 'PNOA' : 'Hidrografía HY.Network';
  await check(`${label} WMS GetMap 1.1.1 EPSG:3857`, tileUrl(source, { x: 0, y: 0, z: 0 }, bounds), 'png');
  const capabilities = new URL(source.url);
  capabilities.search = new URLSearchParams({ SERVICE: 'WMS', REQUEST: 'GetCapabilities', VERSION: '1.1.1' }).toString();
  await check(`${label} GetCapabilities`, capabilities.toString(), 'capabilities');
}
await check('Terrarium AWS tile', 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/8/123/93.png', 'png');
const style = await check('OpenFreeMap Positron style', 'https://tiles.openfreemap.org/styles/positron', 'json');
await check('OpenFreeMap Dark style', 'https://tiles.openfreemap.org/styles/dark', 'json');
if (style?.sources) {
  const source = Object.values(style.sources).find(source => source.type === 'vector' && source.url);
  if (source) {
    const tileJson = await check('OpenFreeMap vector TileJSON', source.url, 'json');
    if (tileJson?.tiles?.length) await check('OpenFreeMap vector tile', tileJson.tiles[0].replace('{z}', '8').replace('{x}', '123').replace('{y}', '93'), 'binary');
  }
  if (style.glyphs) await check('OpenFreeMap font glyphs', style.glyphs.replace('{fontstack}', encodeURIComponent('Noto Sans Regular')).replace('{range}', '0-255'), 'binary');
}
const report = {
  date: new Date().toISOString(), originHeader: origin, testBoundsWgs84: bounds,
  scope: 'HTTP requests with a browser Origin header, MIME type, PNG signature/dimensions or structured response; not a browser render test or availability guarantee.',
  baseProvider: 'OpenFreeMap; public styles without API key per https://openfreemap.org/quick_start/. CARTO was replaced following its 2026-09-23 API key requirement.',
  checks,
};
await writeFile(new URL('../docs/sources-check.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (checks.some(check => !check.ok)) process.exitCode = 1;
