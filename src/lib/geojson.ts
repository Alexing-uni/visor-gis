import proj4 from 'proj4';
import type { Collection, Kind, VectorFeature, VectorGeometry } from '../types.ts';

// CRS explícitos: proj4 no incluye todos los códigos EPSG por defecto.
// Aproximación de datum para visualización. La Z se conserva; no se transforma el datum vertical.
proj4.defs('EPSG:31994', '+proj=utm +zone=19 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
proj4.defs('EPSG:4258', '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs');

const geometries: Record<Kind, string[]> = {
  point: ['Point', 'MultiPoint'], line: ['LineString', 'MultiLineString'], polygon: ['Polygon', 'MultiPolygon'],
};
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function canonicalCrs(value: string): string {
  if (/^(OGC:CRS84|CRS84|urn:ogc:def:crs:OGC:1\.3:CRS84)$/i.test(value)) return 'EPSG:4326';
  const code = /^EPSG:(\d+)$/i.exec(value)?.[1] ?? /^urn:(?:x-)?ogc:def:crs:EPSG:[^:]*:(\d+)$/i.exec(value)?.[1];
  if (!code || !['31994', '3857', '4258', '4326'].includes(code)) throw new Error(`CRS no soportado: ${value}`);
  return `EPSG:${code}`;
}
export function resolveCrs(raw: unknown, expected: string): string {
  const configured = canonicalCrs(expected);
  if (!object(raw) || raw.crs === undefined || raw.crs === null) return configured;
  const crs = raw.crs;
  if (!object(crs) || crs.type !== 'name' || !object(crs.properties) || typeof crs.properties.name !== 'string') {
    throw new Error('La declaración CRS del GeoJSON no es válida');
  }
  const declared = canonicalCrs(crs.properties.name);
  if (declared !== configured) throw new Error(`CRS incompatible: archivo ${declared}, capa ${configured}`);
  return declared;
}
function position(value: unknown): asserts value is number[] {
  if (!Array.isArray(value) || value.length < 2 || !value.every(n => typeof n === 'number' && Number.isFinite(n))) {
    throw new Error('Una posición debe contener al menos dos números finitos');
  }
}
function list(value: unknown, minimum: number, check: (item: unknown) => void) {
  if (!Array.isArray(value) || value.length < minimum) throw new Error(`Se esperaban al menos ${minimum} elementos`);
  value.forEach(check);
}
function line(value: unknown) { list(value, 2, position); }
function ring(value: unknown) {
  list(value, 4, position);
  const positions = value as number[][];
  const a = positions[0], b = positions[positions.length - 1];
  if (a.length !== b.length || a.some((coordinate, i) => coordinate !== b[i])) throw new Error('Anillo de polígono sin cerrar');
}
function polygon(value: unknown) { list(value, 1, ring); }
export function validateDataset(raw: unknown, kind?: Kind): asserts raw is Collection {
  if (!object(raw) || raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) throw new Error('Se esperaba una FeatureCollection');
  raw.features.forEach((feature, index) => {
    try {
      if (!object(feature) || feature.type !== 'Feature' || !object(feature.geometry)) throw new Error('Feature o geometría ausente');
      if (feature.properties !== null && !object(feature.properties)) throw new Error('Las propiedades deben ser un objeto o null');
      const { type, coordinates } = feature.geometry;
      if (typeof type !== 'string' || (kind && !geometries[kind].includes(type))) throw new Error(`Geometría incompatible con la capa ${kind}`);
      switch (type) {
        case 'Point': position(coordinates); break;
        case 'MultiPoint': list(coordinates, 1, position); break;
        case 'LineString': line(coordinates); break;
        case 'MultiLineString': list(coordinates, 1, line); break;
        case 'Polygon': polygon(coordinates); break;
        case 'MultiPolygon': list(coordinates, 1, polygon); break;
        default: throw new Error(`Geometría no soportada: ${type}`);
      }
    } catch (error) { throw new Error(`Entidad ${index + 1}: ${error instanceof Error ? error.message : String(error)}`); }
  });
}
export function valid(raw: unknown): raw is Collection {
  try { validateDataset(raw); return true; } catch { return false; }
}
function transformCoordinates(value: unknown, transform: (p: number[]) => number[]): unknown {
  const coordinates = value as unknown[];
  return typeof coordinates[0] === 'number' ? transform(coordinates as number[]) : coordinates.map(item => transformCoordinates(item, transform));
}
export function normalize(raw: unknown, expectedCrs: string, kind?: Kind): Collection {
  validateDataset(raw, kind);
  const crs = resolveCrs(raw, expectedCrs);
  const converter = proj4(crs, 'EPSG:4326');
  const transform = (position: number[]) => {
    const [lon, lat] = crs === 'EPSG:4326' ? position : converter.forward([position[0], position[1]]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) {
      throw new Error('Coordenadas fuera del rango geográfico tras la transformación');
    }
    return [lon, lat, ...position.slice(2)];
  };
  // No se conserva el CRS ni bbox originales, ya que ahora todas las posiciones son WGS84.
  return { type: 'FeatureCollection', features: raw.features.map(feature => ({
    type: 'Feature', ...(feature.id !== undefined ? { id: feature.id } : {}),
    properties: feature.properties,
    geometry: { type: feature.geometry.type, coordinates: transformCoordinates(feature.geometry.coordinates, transform) } as VectorGeometry,
  } as VectorFeature)) };
}
