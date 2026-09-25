import type { LayerConfig } from '../types.ts';

// Mismos datos y estilos iniciales que server/database.js; el modo local respeta SQLite.
export const defaultLayers: LayerConfig[] = [
  { id: 'polygons', name: 'Geología · Chile', kind: 'polygon', source: 'polygons.geojson', crs: 'EPSG:4326', visible: true, stroke: '#7c3aed', fill: '#a78bfa', width: 1, opacity: 0.45, radius: 4, sort_order: 0 },
  { id: 'lines', name: 'Viales · Asturias', kind: 'line', source: 'lines.geojson', crs: 'EPSG:4258', visible: true, stroke: '#087f9a', fill: '#087f9a', width: 2, opacity: 0.9, radius: 4, sort_order: 1 },
  { id: 'points', name: 'Puntos · Chile', kind: 'point', source: 'points.geojson', crs: 'EPSG:31994', visible: true, stroke: '#b94709', fill: '#fb923c', width: 1, opacity: 0.9, radius: 4, sort_order: 2 },
];
