import { useEffect, useRef, useState } from 'react';
import { formatDistance, formatDuration, routingClient } from '../lib/routing.ts';
import type { RouteEndpoint, RouteEndpointKind, RouteResult } from '../lib/routing.ts';
import './RoutePanel.css';

export type RoutePanelProps = {
  origin: RouteEndpoint | null;
  destination: RouteEndpoint | null;
  route: RouteResult | null;
  picking: RouteEndpointKind | null;
  onEndpoint: (kind: RouteEndpointKind, point: RouteEndpoint | null) => void;
  onSwap: () => void;
  onRoute: (route: RouteResult | null) => void;
  onPick: (kind: RouteEndpointKind | null) => void;
};

function EndpointSearch({ kind, value, reset, picking, onChange, onPick }: {
  kind: RouteEndpointKind; value: RouteEndpoint | null; reset: number; picking: boolean;
  onChange: (point: RouteEndpoint | null) => void; onPick: () => void;
}) {
  const title = kind === 'origin' ? 'Origen' : 'Destino';
  const [query, setQuery] = useState(value?.label || '');
  const [results, setResults] = useState<RouteEndpoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (value) setQuery(value.label);
    controller.current?.abort();
    setResults([]); setBusy(false); setError('');
  }, [value]);
  useEffect(() => {
    setQuery(value?.label || '');
    controller.current?.abort();
    setResults([]); setBusy(false); setError('');
    // reset is the deliberate clear/swap event; ordinary editing preserves unselected query text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);
  useEffect(() => () => controller.current?.abort(), []);
  const search = async () => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setBusy(true); setError(''); setResults([]);
    try {
      const points = await routingClient.search(query, active.signal);
      if (active.signal.aborted) return;
      setResults(points);
      if (points.length === 0) setError('Sin resultados. Añade la localidad o el país, o elige el punto en el mapa.');
    } catch (error) {
      if (!active.signal.aborted) setError(error instanceof Error ? error.message : String(error));
    } finally { if (!active.signal.aborted) setBusy(false); }
  };
  return <div className="route-endpoint">
    <label htmlFor={`route-${kind}`}><span className={`route-marker ${kind}`}>{kind === 'origin' ? 'A' : 'B'}</span>{title}</label>
    <form className="route-search-form" onSubmit={event => { event.preventDefault(); void search(); }}>
      <input id={`route-${kind}`} value={query} placeholder="Dirección, localidad, país…" maxLength={250} autoComplete="off"
        onChange={event => { controller.current?.abort(); setBusy(false); setQuery(event.target.value); setResults([]); setError(''); if (value) onChange(null); }}/>
      <button type="submit" disabled={busy || query.trim().length < 3} aria-label={`Buscar ${title.toLowerCase()}`}>{busy ? 'Buscando…' : 'Buscar'}</button>
    </form>
    {results.length > 0 && <ul className="route-search-results" aria-label={`Resultados de ${title.toLowerCase()}`}>
      {results.map((point, index) => <li key={`${point.coordinates.join(',')}-${index}`}>
        <button type="button" onClick={() => { onChange(point); setQuery(point.label); setResults([]); }}>{point.label}</button>
      </li>)}
    </ul>}
    <div className="route-endpoint-actions">
      <button type="button" className={picking ? 'active' : ''} aria-pressed={picking} onClick={() => { controller.current?.abort(); setBusy(false); setResults([]); onPick(); }}>
        {picking ? 'Cancelar selección' : `Elegir ${title.toLowerCase()} en mapa`}
      </button>
      {value && <span title="Longitud, latitud en WGS84">{value.coordinates[0].toFixed(4)}, {value.coordinates[1].toFixed(4)}</span>}
    </div>
    {error && <p className="route-error" role="alert">{error}</p>}
  </div>;
}

export function RoutePanel({ origin, destination, route, picking, onEndpoint, onSwap, onRoute, onPick }: RoutePanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const signature = JSON.stringify([origin?.coordinates, destination?.coordinates]);
  const currentSignature = useRef(signature);
  currentSignature.current = signature;
  useEffect(() => { controller.current?.abort(); setBusy(false); setError(''); }, [signature]);
  useEffect(() => () => controller.current?.abort(), []);
  const invalidate = () => { controller.current?.abort(); setBusy(false); setError(''); onRoute(null); };
  const calculate = async () => {
    if (!origin || !destination) return;
    controller.current?.abort();
    const active = new AbortController();
    const requestedSignature = signature;
    controller.current = active;
    setBusy(true); setError(''); onRoute(null); onPick(null);
    try {
      const result = await routingClient.route(origin, destination, active.signal);
      if (!active.signal.aborted && currentSignature.current === requestedSignature) onRoute(result);
    } catch (error) {
      if (!active.signal.aborted && currentSignature.current === requestedSignature) setError(error instanceof Error ? error.message : String(error));
    } finally { if (!active.signal.aborted) setBusy(false); }
  };
  const clear = () => { invalidate(); onPick(null); onEndpoint('origin', null); onEndpoint('destination', null); setReset(value => value + 1); };
  return <section className="route-panel" aria-label="Calcular rutas">
    <div className="route-heading"><h2>Planifica un recorrido</h2><span className="route-mode">Coche</span></div>
    <p className="route-caption">Busca y selecciona un resultado, o marca cada punto en el mapa. El recorrido sigue la red de carreteras.</p>
    <EndpointSearch kind="origin" value={origin} reset={reset} picking={picking === 'origin'}
      onChange={point => { invalidate(); onEndpoint('origin', point); }} onPick={() => { invalidate(); onPick(picking === 'origin' ? null : 'origin'); }}/>
    <button className="route-swap" type="button" disabled={!origin && !destination} onClick={() => { invalidate(); onPick(null); onSwap(); setReset(value => value + 1); }}>
      ⇅ Intercambiar origen y destino
    </button>
    <EndpointSearch kind="destination" value={destination} reset={reset} picking={picking === 'destination'}
      onChange={point => { invalidate(); onEndpoint('destination', point); }} onPick={() => { invalidate(); onPick(picking === 'destination' ? null : 'destination'); }}/>
    {picking && <p className="route-picking" role="status">Pulsa o toca el mapa para fijar el {picking === 'origin' ? 'origen' : 'destino'}. Puedes mover el mapa antes de elegir.</p>}
    <div className="route-main-actions">
      <button className="route-primary" type="button" disabled={!origin || !destination || busy} onClick={() => void calculate()}>{busy ? 'Calculando…' : 'Calcular ruta'}</button>
      <button type="button" onClick={clear}>Limpiar</button>
    </div>
    {error && <p className="route-error" role="alert">{error}</p>}
    {route && <div className="route-result" aria-live="polite">
      <div className="route-totals"><strong>{formatDistance(route.distance)}</strong><strong>{formatDuration(route.duration)}</strong></div>
      <p className="route-caption">Duración estimada, sin tráfico en tiempo real.</p>
      <p className="route-caption">Acceso por carretera a {formatDistance(route.waypoints[0].distance)} del origen y {formatDistance(route.waypoints[1].distance)} del destino. Estos accesos no están incluidos en la distancia ni en el tiempo.</p>
      <details className="route-directions" open><summary>Indicaciones ({route.steps.length})</summary>
        <ol>{route.steps.map((step, index) => <li key={index}><span>{step.instruction}</span><small>{formatDistance(step.distance)}</small></li>)}</ol>
      </details>
    </div>}
    <div className="route-provider">
      <p>Búsquedas: <a href="https://github.com/komoot/photon" target="_blank" rel="noreferrer">Photon · Komoot</a>. Rutas: <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noreferrer">OSRM · FOSSGIS</a>. Datos © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Corregir el mapa</a>.</p>
      <p>Servicios públicos de demostración, para uso moderado y sin garantía de disponibilidad. Al buscar o calcular se envían el texto o las coordenadas al proveedor. En esta versión solo se ofrece coche.</p>
    </div>
  </section>;
}
