import type { Bounds, Place } from '../types.ts';
export function hasBounds(value: unknown): value is Bounds {
  return Array.isArray(value) && value.length === 4 && value.every(item => typeof item === 'number' && Number.isFinite(item)) && value[0] <= value[2] && value[1] <= value[3];
}
export function destination(place: Place): { bounds: Bounds } | { center: [number, number] } {
  if (hasBounds(place.bounds)) return { bounds: place.bounds };
  if (place.center?.length !== 2 || !place.center.every(Number.isFinite)) throw new Error('Ubicación sin coordenadas válidas');
  return { center: place.center };
}
