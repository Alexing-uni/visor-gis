import { readFileSync, writeFileSync } from 'node:fs';
import bbox from '@turf/bbox';
import { normalize } from '../src/lib/geojson.ts';
const definitions = [
  ['points', 'EPSG:31994', 'point', 'Área de puntos · Chile', 'pendiente puntos chile'],
  ['polygons', 'EPSG:4326', 'polygon', 'Área geológica · Chile', 'geologia poligonos chile'],
  ['lines', 'EPSG:4258', 'line', 'Red viaria · Asturias, España', 'viales calles lineas oviedo asturias espana'],
];
const places = [];
for (const [id, crs, kind, label, keywords] of definitions) {
  const raw = JSON.parse(readFileSync(new URL(`../public/data/${id}.geojson`, import.meta.url), 'utf8'));
  const data = normalize(raw, crs, kind);
  if (!data.features.length) continue;
  const bounds = bbox(data), center = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
  places.push({ id, label, keywords, bounds, center, source: 'local' });
  if (id !== 'polygons') places.push({ id: `${id}-center`, label: `Centro: ${label}`, keywords: `centro ${keywords}`, center, source: 'local' });
  console.log(`${id}: ${data.features.length} entidades validadas`);
}
writeFileSync(new URL('../server/places.json', import.meta.url), JSON.stringify(places, null, 2) + '\n');
