import { useEffect, useState } from 'react';
import { AutoComplete, Input, Spin } from 'antd';
import { getJson } from '../lib/api.ts';
import type { Place } from '../types.ts';
import { staticUrl, storageMode } from '../lib/environment.ts';
const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
let catalog: Promise<(Place & { keywords?: string })[]> | undefined;
async function search(query: string, signal: AbortSignal): Promise<Place[]> {
  if (storageMode === 'server') return getJson<Place[]>(`/api/search?q=${encodeURIComponent(query)}`, { signal });
  // Un único catálogo bajo BASE_URL para repositorios Pages con subdirectorio.
  catalog ??= getJson<(Place & { keywords?: string })[]>(staticUrl('data/places.json')).catch(error => { catalog = undefined; throw error; });
  const words = fold(query.trim()).split(/\s+/);
  return (await catalog).filter(place => words.every(word => fold(`${place.label} ${place.keywords || ''}`).includes(word))).slice(0, 8);
}
export function LocationSearch({ select }: { select: (place: Place) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setResults([]); setError(''); setBusy(false);
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try { const next = await search(query, controller.signal); if (!controller.signal.aborted) setResults(next); }
      catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const choose = (id: string) => {
    const place = results.find(result => result.id === id);
    if (place) { select(place); setQuery(''); setResults([]); }
  };
  return <div className="search"><AutoComplete value={query} onChange={setQuery} options={results.map(place => ({ value: place.id, label: place.label }))} onSelect={choose}
    notFoundContent={busy ? <Spin size="small"/> : query.trim().length >= 2 ? 'Sin ubicaciones en el catálogo local' : null} style={{ width: '100%' }}>
    <Input.Search aria-label="Buscar ubicación" placeholder="Buscar Chile o Asturias…" onSearch={() => { if (results[0]) choose(results[0].id); }}/>
    </AutoComplete><div className="search-caption">Catálogo local de los datos del proyecto</div>{error && <div role="alert" className="search-error">{error}</div>}</div>;
}
