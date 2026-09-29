import type { Collection } from '../types.ts';

// Rendering copy only. Original Z, properties and export/analysis data remain intact.
const grounded = new WeakMap<Collection, Collection>();
export function groundCoordinates(data: Collection): Collection {
  const cached = grounded.get(data);
  if (cached) return cached;
  const flatten = (coordinates: unknown): unknown => {
    const values = coordinates as unknown[];
    return typeof values[0] === 'number' ? values.slice(0, 2) : values.map(flatten);
  };
  const result = { ...data, features: data.features.map(feature => ({ ...feature,
    geometry: { ...feature.geometry, coordinates: flatten(feature.geometry.coordinates) }
  })) } as Collection;
  grounded.set(data, result);
  return result;
}

export function terrainDecoder(exaggeration: number) {
  if (!Number.isFinite(exaggeration) || exaggeration < 0 || exaggeration > 3) throw new Error('Exageración fuera de rango');
  return { rScaler: 256 * exaggeration, gScaler: exaggeration, bScaler: exaggeration / 256, offset: -32768 * exaggeration };
}
