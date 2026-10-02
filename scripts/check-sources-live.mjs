// Manual external-service checks; deliberately excluded from npm test and CI.
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { officialSources, tileUrl } from '../src/lib/raster.ts';

const origin = 'https://example.github.io';
const checks = [];
const bounds = [-5.86, 43.35, -5.81, 43.39];
const headers = { Origin: origin, 'User-Agent': 'VisorGIS/1.2 manual-source-check' };

function webpDimensions(bytes) {
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') return null;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const chunk = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4), data = offset + 8;
    if (data + size > bytes.length) return null;
    if (chunk === 'VP8X' && size >= 10) return { width: bytes.readUIntLE(data + 4, 3) + 1, height: bytes.readUIntLE(data + 7, 3) + 1 };
    if (chunk === 'VP8L' && size >= 5 && bytes[data] === 0x2f) return {
      width: (bytes[data + 1] | (bytes[data + 2] & 0x3f) << 8) + 1,
      height: (bytes[data + 2] >> 6 | bytes[data + 3] << 2 | (bytes[data + 4] & 0x0f) << 10) + 1,
    };
    if (chunk === 'VP8 ' && size >= 10 && bytes.subarray(data + 3, data + 6).equals(Buffer.from([0x9d, 0x01, 0x2a]))) return {
      width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff,
    };
    offset = data + size + (size % 2);
  }
  return null;
}

function xyzAt(longitude, latitude, z) {
  const latitudeRadians = latitude * Math.PI / 180, scale = 2 ** z;
  return { z, x: Math.floor((longitude + 180) / 360 * scale),
    y: Math.floor((1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2 * scale) };
}

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
    } else if (format === 'webp') {
      const dimensions = webpDimensions(bytes);
      result.webpSignature = !!dimensions;
      if (dimensions) Object.assign(result, dimensions);
      result.validFormat = result.webpSignature && result.width === 512 && result.height === 512 && result.contentType?.startsWith('image/webp');
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
await check('OpenFreeMap Liberty style', 'https://tiles.openfreemap.org/styles/liberty', 'json');
if (style?.sources) {
  const source = Object.values(style.sources).find(source => source.type === 'vector' && source.url);
  if (source) {
    const tileJson = await check('OpenFreeMap vector TileJSON', source.url, 'json');
    if (tileJson?.tiles?.length) await check('OpenFreeMap vector tile', tileJson.tiles[0].replace('{z}', '8').replace('{x}', '123').replace('{y}', '93'), 'binary');
  }
  if (style.glyphs) await check('OpenFreeMap font glyphs', style.glyphs.replace('{fontstack}', encodeURIComponent('Noto Sans Regular')).replace('{range}', '0-255'), 'binary');
}
await check('Mapterhorn TileJSON', 'https://tiles.mapterhorn.com/tilejson.json', 'json');
const oviedo = xyzAt(-5.8494, 43.3614, 14);
await check('Mapterhorn Oviedo DEM WebP 512 z14', `https://tiles.mapterhorn.com/${oviedo.z}/${oviedo.x}/${oviedo.y}.webp`, 'webp');
await check('VersaTiles Satellite style', 'https://tiles.versatiles.org/styles/satellite/style.json', 'json');
const lisboa = xyzAt(-9.1393, 38.7223, 15);
await check('VersaTiles Lisboa satellite WebP 512 z15', `https://tiles.versatiles.org/tiles/satellite/${lisboa.z}/${lisboa.x}/${lisboa.y}`, 'webp');
const report = {
  date: new Date().toISOString(), originHeader: origin, testBoundsWgs84: bounds,
  scope: 'HTTP requests with a browser Origin header, MIME type, PNG/WebP signature/dimensions or structured response; not a browser render test or availability guarantee.',
  baseProvider: 'OpenFreeMap public styles and VersaTiles satellite imagery without API keys; Mapterhorn elevation with AWS Terrain Tiles as an alternative. CARTO was replaced following its 2026-09-23 API key requirement.',
  checks,
};
await writeFile(new URL('../docs/sources-check.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (checks.some(check => !check.ok)) process.exitCode = 1;
