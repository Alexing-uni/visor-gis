import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Collection, LayerConfig, LayerPatch } from '../types.ts';
import { getJson } from '../lib/api.ts';
import { normalize } from '../lib/geojson.ts';
import { createLayer } from '../model/createLayer.ts';

export function useLayers() {
  const [configs, setConfigs] = useState<LayerConfig[]>([]);
  const [datasets, setDatasets] = useState<Record<string, Collection>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const layers = await getJson<LayerConfig[]>('/api/layers', { signal: controller.signal });
        if (controller.signal.aborted) return;
        setConfigs(layers);
        await Promise.allSettled(layers.map(async layer => {
          try {
            const raw = await getJson<unknown>(`/api/layers/${layer.id}/data`, { signal: controller.signal });
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
  }, []);
  const enqueue = useCallback((work: () => Promise<void>) => {
    pending.current += 1;
    setSaving(true);
    setSaveError('');
    queue.current = queue.current.then(work).catch(error => {
      setSaveError(error instanceof Error ? error.message : String(error));
    }).finally(() => {
      pending.current -= 1;
      setSaving(pending.current > 0);
    });
  }, []);
  const edit = useCallback((id: string, patch: LayerPatch) => enqueue(async () => {
    const saved = await getJson<LayerConfig>(`/api/layers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    setConfigs(previous => previous.map(layer => layer.id === id ? saved : layer));
  }), [enqueue]);
  const reorder = useCallback((ids: string[]) => enqueue(async () => {
    const saved = await getJson<LayerConfig[]>('/api/layers/order', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    setConfigs(saved);
  }), [enqueue]);
  const models = useMemo(() => configs.filter(config => datasets[config.id]).map(config => createLayer(config, datasets[config.id])), [configs, datasets]);
  return { configs, models, errors, loading, fatal, saving, saveError, edit, reorder };
}
