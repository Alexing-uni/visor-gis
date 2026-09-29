import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { validateDataset } from './geojson.ts';
import { validCoordinate } from './routing.ts';
import { distance } from '@turf/turf';

export const ISOCHRONE_URL = 'https://valhalla1.openstreetmap.de/isochrone';
export type ServiceArea = FeatureCollection<Polygon | MultiPolygon> & { access?: { coordinates: [number, number]; distanceMetres: number }; origin?: [number, number]; minutes?: number; provider?: string };
export function isochroneRequest(coordinates: [number, number], minutes: number) {
  if (!validCoordinate(coordinates)) throw new Error('Elige un origen válido.');
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 60) throw new Error('El tiempo debe estar entre 5 y 60 minutos.');
  return { locations: [{ lon: coordinates[0], lat: coordinates[1], radius: 0, search_cutoff: 1000 }], costing: 'auto',
    contours: [{ time: minutes }], polygons: true, denoise: 0.2, generalize: 30 };
}
export function parseServiceArea(value: unknown, minutes: number): ServiceArea {
  validateDataset(value, 'polygon');
  if (!value.features.length) throw new Error('No hay una zona accesible desde este punto. Acerca el origen a una carretera.');
  for (const feature of value.features) {
    if (feature.properties?.contour !== minutes) throw new Error('La respuesta no corresponde al tiempo solicitado.');
  }
  return value as ServiceArea;
}
export function roadAccess(value: unknown, origin: [number, number]) {
  const edges = Array.isArray(value) && value[0]?.edges;
  if (!Array.isArray(edges)) throw new Error('El proveedor no ha confirmado el acceso a carretera.');
  const candidates = edges.flatMap((edge: {correlated_lon?: number; correlated_lat?: number}) => {
    const coordinates = [edge.correlated_lon, edge.correlated_lat];
    return validCoordinate(coordinates) ? [{ coordinates, distanceMetres: distance(origin, coordinates, {units:'meters'}) }] : [];
  }).filter(edge=>edge.distanceMetres <= 1000).sort((a,b)=>a.distanceMetres-b.distanceMetres);
  if (!candidates.length) throw new Error('No hay acceso a una carretera a menos de 1 km. Elige otro origen.');
  return candidates[0];
}
export async function calculateServiceArea(coordinates: [number, number], minutes: number, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<ServiceArea> {
  const query = isochroneRequest(coordinates, minutes);
  const combinedSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(30000)]);
  const request = async (url: string, body: unknown) => {
    const response = await fetcher(`${url}?json=${encodeURIComponent(JSON.stringify(body))}`, {signal:combinedSignal,credentials:'omit'});
    if (response.status === 429) throw new Error('El servicio está ocupado. Espera antes de volver a calcular.');
    if (response.status === 400) throw new Error('No se pudo acceder a la red de carreteras. Prueba otro origen.');
    if (!response.ok) throw new Error(`Valhalla no está disponible (HTTP ${response.status}). Reintenta más tarde.`);
    return response.json();
  };
  // Valhalla can return a tiny polygon in the ocean: an isochrone alone is not proof of road access.
  const access = roadAccess(await request(ISOCHRONE_URL.replace('/isochrone','/locate'), {locations:query.locations,costing:'auto',verbose:false}),coordinates);
  const data = parseServiceArea(await request(ISOCHRONE_URL, isochroneRequest(access.coordinates,minutes)),minutes);
  return {...data, access, origin:coordinates, minutes, provider:'Valhalla / FOSSGIS · OpenStreetMap'};
}
