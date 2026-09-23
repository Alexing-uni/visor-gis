import proj4 from 'proj4';
import type {Collection} from '../types';

// EPSG:31994: SIRGAS 1995 / UTM zone 19S.
const projections: Record<string, string> = {
  'EPSG:31994': '+proj=utm +zone=19 +south +ellps=GRS80 +units=m +no_defs +type=crs',
  'EPSG:4258': 'EPSG:4258',
  'EPSG:4326': 'EPSG:4326'
};
const walk = (coords: unknown, convert: (position: number[]) => number[]): unknown =>
  Array.isArray(coords) && typeof coords[0] === 'number' ? convert(coords as number[]) :
  Array.isArray(coords) ? coords.map(value => walk(value, convert)) : coords;

export function normalize(data: Collection, crs: string): Collection {
  const source = projections[crs];
  if (!source) throw new Error(`CRS no configurado: ${crs}`);
  return {type: 'FeatureCollection', features: data.features.map(feature => ({
    ...feature,
    geometry: {...feature.geometry, coordinates: walk(feature.geometry.coordinates, position => {
      const [x, y] = crs === 'EPSG:4326' ? position : proj4(source, 'EPSG:4326', [position[0], position[1]]);
      return [x, y, ...position.slice(2)];
    })}
  }))};
}
export function valid(data: unknown): data is Collection {
  return !!data && typeof data === 'object' && (data as Collection).type === 'FeatureCollection' &&
    Array.isArray((data as Collection).features) && (data as Collection).features.every(feature =>
      feature.type === 'Feature' && feature.geometry && Array.isArray(feature.geometry.coordinates));
}
