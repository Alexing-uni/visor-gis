import { createTerrainTileFetcher, terrainCrop } from './terrainSource.ts';
import type { TerrainFetchOptions, TerrainTileIndex } from './terrainSource.ts';

export const satelliteTiles = 'https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}';
export const satelliteProtocolTiles = 'visor-satellite://tiles/{z}/{x}/{y}';

const abortReason = (signal?: AbortSignal): Error => signal?.reason instanceof Error
  ? signal.reason : new DOMException('Carga de imágenes cancelada.', 'AbortError');

// Shared by deck.gl's 3D base and MapLibre's 2D custom raster protocol.
// Both views use the same geographic fallback and raw-byte cache.
export function createSatelliteFetcher(options: TerrainFetchOptions = {}) {
  const fetchTile = createTerrainTileFetcher({ ...options, label: options.label ?? 'las imágenes del fondo',
    urlForTile: options.urlForTile ?? (index => satelliteTiles.replace('{z}', String(index.z))
      .replace('{x}', String(index.x)).replace('{y}', String(index.y))) });

  return async (index: TerrainTileIndex, signal?: AbortSignal): Promise<ImageBitmap> => {
    const data = await fetchTile(index, signal);
    if (signal?.aborted) throw abortReason(signal);
    const bitmap = await createImageBitmap(new Blob([data.buffer], { type: data.mimeType }));
    let result: ImageBitmap | undefined;
    try {
      if (signal?.aborted) throw abortReason(signal);
      if (data.index.z === index.z) return bitmap;
      const crop = terrainCrop(index, data.index, bitmap.width);
      const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(512, 512) : document.createElement('canvas');
      canvas.width = 512; canvas.height = 512;
      const context = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
      if (!context) throw new Error('El navegador no puede preparar las imágenes del fondo.');
      // These pixels are colors rather than encoded heights; interpolation is
      // appropriate for a less pixelated preview of the available imagery.
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, 512, 512);
      result = 'transferToImageBitmap' in canvas ? canvas.transferToImageBitmap() : await createImageBitmap(canvas);
      if (signal?.aborted) throw abortReason(signal);
      return result;
    } catch (error) {
      result?.close();
      throw error;
    } finally {
      if (data.index.z !== index.z || signal?.aborted) bitmap.close();
    }
  };
}
