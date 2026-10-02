import type { Feature, Polygon, MultiPolygon, Position } from 'geojson';

type Building = Feature<Polygon | MultiPolygon>;
const height = (value: unknown) => typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN;

// OpenMapTiles render_height can derive from OSM height, storeys or estimates.
// Tile buildings are visual decoration, never part of GIS entity counts.
export function buildingDimensions(feature: Feature): { base: number; extrusion: number } | null {
  const p = feature.properties;
  if (!p || !['Polygon', 'MultiPolygon'].includes(feature.geometry?.type) || [true, 'true', 1, '1'].includes(p.hide_3d)) return null;
  const top = height(p.render_height);
  const base = p.render_min_height == null ? 0 : height(p.render_min_height);
  if (!Number.isFinite(top) || !Number.isFinite(base) || base < 0 || top <= base) return null;
  return { base, extrusion: top - base };
}

export function prepareBuildings(features: Feature[]): Building[] {
  return features.flatMap(feature => {
    const dimensions = buildingDimensions(feature);
    if (!dimensions) return [];
    const lift = (coordinates: Position | Position[] | Position[][] | Position[][][]): unknown => typeof coordinates[0] === 'number'
      ? [(coordinates as Position)[0], (coordinates as Position)[1], dimensions.base]
      : (coordinates as Position[]).map(lift);
    return [{ ...feature, geometry: { ...feature.geometry, coordinates: lift((feature.geometry as Polygon | MultiPolygon).coordinates) } } as Building];
  });
}
