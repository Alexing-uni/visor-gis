import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Collection, LayerConfig, LayerPatch } from '../types.ts';
import { getJson } from '../lib/api.ts';
import { normalize } from '../lib/geojson.ts';
import { createLayer } from '../model/createLayer.ts';
import { defaultLayers } from '../config/defaultLayers.ts';
import { storageMode, staticUrl } from '../lib/environment.ts';
import { createLayerStorage, mergeLayerConfigs } from '../lib/storage.ts';
import type { ImportedLayer } from '../lib/import.ts';

export function useLayers() {
  const [configs, setConfigs] = useState<LayerConfig[]>([]);
  const current = useRef<LayerConfig[]>([]);
  const [datasets, setDatasets] = useState<Record<string, Collection>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const storage = useMemo(() => createLayerStorage(storageMode, globalThis.indexedDB, `visor-gis-v04:${import.meta.env.BASE_URL}`), []);
  const commit = useCallback((next: LayerConfig[]) => { current.current = next; setConfigs(next); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const [originals, saved] = await Promise.all([
          storageMode === 'browser' ? Promise.resolve(defaultLayers) : getJson<LayerConfig[]>('/api/layers', { signal: controller.signal }),
          storage.load().catch(error => {
            if (!controller.signal.aborted) setSaveError(`No se pudieron leer las preferencias ni las importaciones: ${error instanceof Error ? error.message : String(error)}. Las capas originales siguen disponibles.`);
            return { configs: null, imports: [] };
          }),
        ]);
        if (controller.signal.aborted) return;
        const layers = mergeLayerConfigs(originals, saved, storageMode);
        commit(layers);
        await Promise.allSettled(layers.map(async layer => {
          try {
            const imported = saved.imports.find(item => item.config.id === layer.id);
            const raw = imported ? imported.data : await getJson<unknown>(storageMode === 'browser' ? staticUrl(`data/${layer.source}`) : `/api/layers/${encodeURIComponent(layer.id)}/data`, { signal: controller.signal });
            const data = normalize(raw, layer.crs, layer.kind);
            if (!controller.signal.aborted) setDatasets(previous => ({ ...previous, [layer.id]: data }));
          } catch (error) {
            if (!controller.signal.aborted) setErrors(previous => ({ ...previous, [layer.id]: error instanceof Error ? error.message : String(error) }));
          }
        }));
      } catch (error) {
        if (!controller.signal.aborted) setFatal(error instanceof Error ? error.message : String(error));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [commit, storage]);
  const enqueue = useCallback((work: () => Promise<void>, propagate = false): Promise<void> => {
    pending.current += 1;
    setSaving(true);
    setSaveError('');
    const operation = queue.current.then(work).catch(error => {
      setSaveError(error instanceof Error ? error.message : String(error));
      throw error;
    }).finally(() => {
      pending.current -= 1;
      setSaving(pending.current > 0);
    });
    queue.current = operation.catch(() => {});
    return propagate ? operation : queue.current;
  }, []);
  const edit = useCallback((id: string, patch: LayerPatch) => { void enqueue(async () => {
    const layer = current.current.find(item => item.id === id);
    if (!layer) throw new Error('Capa no encontrada.');
    if (storageMode === 'server' && layer.source !== 'browser:import') {
      const saved = await getJson<LayerConfig>(`/api/layers/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      commit(current.current.map(item => item.id === id ? { ...saved, sort_order: item.sort_order } : item));
    } else {
      const next = current.current.map(item => item.id === id ? { ...item, ...patch } : item);
      await storage.saveConfigs(next);
      commit(next);
    }
  }); }, [commit, enqueue, storage]);
  const reorder = useCallback((ids: string[]) => { void enqueue(async () => {
    if (ids.length !== current.current.length || new Set(ids).size !== ids.length || ids.some(id => !current.current.some(layer => layer.id === id))) throw new Error('El orden debe contener todas las capas una sola vez.');
    const next = ids.map((id, sort_order) => ({ ...current.current.find(layer => layer.id === id)!, sort_order }));
    // Los originales siguen guardando su orden compartido en SQLite. La posición de imports es local.
    if (storageMode === 'server') {
      const serverIds = next.filter(layer => layer.source !== 'browser:import').map(layer => layer.id);
      await getJson<LayerConfig[]>('/api/layers/order', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: serverIds }) });
      if (next.some(layer => layer.source === 'browser:import')) {
        try { await storage.saveConfigs(next); }
        catch { commit(next); throw new Error('El orden de las capas originales se ha guardado en SQLite. No se pudo guardar la posición de las importaciones en este navegador; puede cambiar al recargar.'); }
      }
    } else {
      await storage.saveConfigs(next);
    }
    commit(next);
  }); }, [commit, enqueue, storage]);
  const addImported = useCallback((items: ImportedLayer[]) => enqueue(async () => {
    if (loading || fatal) throw new Error('Espera a que termine la carga de capas antes de importar. Si hay un error de conexión, resuélvelo y reintenta.');
    if (!items.length) throw new Error('No hay entidades para importar.');
    const ids = new Set(current.current.map(layer => layer.id));
    items.forEach(item => {
      if (ids.has(item.config.id) || item.config.source !== 'browser:import') throw new Error('Identificador de importación inválido o repetido.');
      ids.add(item.config.id);
    });
    const next = [...current.current, ...items.map((item, index) => ({ ...item.config, sort_order: current.current.length + index }))];
    await storage.add(items, next);
    commit(next);
    setDatasets(previous => ({ ...previous, ...Object.fromEntries(items.map(item => [item.config.id, item.data])) }));
  }, true), [commit, enqueue, storage, loading, fatal]);
  const removeImported = useCallback((id: string) => enqueue(async () => {
    if (!current.current.some(layer => layer.id === id && layer.source === 'browser:import')) throw new Error('Solo pueden eliminarse capas importadas.');
    const next = current.current.filter(layer => layer.id !== id).map((layer, sort_order) => ({ ...layer, sort_order }));
    await storage.remove(id, next);
    commit(next);
    setDatasets(previous => { const copy = { ...previous }; delete copy[id]; return copy; });
    setErrors(previous => { const copy = { ...previous }; delete copy[id]; return copy; });
  }, true), [commit, enqueue, storage]);
  const models = useMemo(() => configs.filter(config => datasets[config.id]).map(config => createLayer(config, datasets[config.id])), [configs, datasets]);
  const importedIds = configs.filter(layer => layer.source === 'browser:import').map(layer => layer.id);
  return { configs, models, errors, loading, fatal, saving, saveError, edit, reorder, storageMode, importedIds, addImported, removeImported };
}
