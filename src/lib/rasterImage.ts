/** A single bounded retry for transient service failures; panning cancellation is silent. */
export async function fetchRasterImage(url: string, signal?: AbortSignal): Promise<ImageBitmap> {
  for (let attempt = 0; attempt < 2; attempt++) {
    signal?.throwIfAborted();
    const active = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(15000)]);
    try {
      const response = await fetch(url, { signal: active, credentials: 'omit' });
      if (!response.ok) {
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
        throw new Error(`El servicio respondió HTTP ${response.status}.`);
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('El servicio no devolvió una imagen. Revisa capa, versión WMS y EPSG:3857.');
      signal?.throwIfAborted();
      return await createImageBitmap(blob);
    } catch (error) {
      signal?.throwIfAborted();
      if (attempt === 0 && (error instanceof TypeError || active.aborted)) continue;
      if (active.aborted) throw new Error('El servicio tardó más de 15 segundos en responder.');
      throw error;
    }
  }
  throw new Error('El servicio no respondió después de reintentar.');
}
