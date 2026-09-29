import { useEffect, useRef, useState } from 'react';
import { Button, Slider } from 'antd';
import { area } from '@turf/turf';
import { EndpointSearch } from './RoutePanel.tsx';
import type { RouteEndpoint } from '../lib/routing.ts';
import { calculateServiceArea } from '../lib/serviceArea.ts';
import type { ServiceArea } from '../lib/serviceArea.ts';

export function ServiceAreaPanel({ origin, onOrigin, picking, onPick, result, onResult }: {
  origin: RouteEndpoint | null; onOrigin: (point: RouteEndpoint | null) => void;
  picking: boolean; onPick: (active: boolean) => void;
  result: ServiceArea | null; onResult: (data: ServiceArea | null) => void;
}) {
  const [minutes, setMinutes] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reset, setReset] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const key = JSON.stringify([origin?.coordinates, minutes]);
  const currentKey = useRef(key); currentKey.current = key;
  useEffect(() => { controller.current?.abort(); setBusy(false); setError(''); }, [key]);
  useEffect(() => () => controller.current?.abort(), []);
  const clear = () => { controller.current?.abort(); setBusy(false); setError(''); onResult(null); };
  const calculate = async () => {
    if (!origin) return;
    clear(); onPick(false);
    const active = new AbortController(); controller.current = active;
    const requestedKey = key; setBusy(true);
    try {
      const data = await calculateServiceArea(origin.coordinates, minutes, active.signal);
      if (!active.signal.aborted && currentKey.current === requestedKey) onResult(data);
    } catch (e) {
      if (!active.signal.aborted && currentKey.current === requestedKey) setError(e instanceof Error && e.name === 'TimeoutError' ? 'El servicio ha tardado demasiado. Reintenta.' : e instanceof TypeError ? 'No se pudo conectar con Valhalla. Revisa tu conexión.' : String(e instanceof Error ? e.message : e));
    } finally { if (!active.signal.aborted) setBusy(false); }
  };
  return <section className="route-panel" aria-label="Área de alcance en coche">
    <h2>¿Hasta dónde llego?</h2>
    <p>Zona que puedes alcanzar saliendo de un punto y conduciendo durante el tiempo elegido.</p>
    <EndpointSearch kind="origin" value={origin} reset={reset} picking={picking} onChange={point => { clear(); onOrigin(point); }} onPick={() => { clear(); onPick(!picking); }}/>
    <label>Tiempo en coche: <strong>{minutes} minutos</strong><Slider ariaLabelForHandle="Minutos de alcance" min={5} max={60} step={5} value={minutes} onChange={value => { clear(); setMinutes(value); }}/></label>
    <div className="actions"><Button type="primary" disabled={!origin || busy} onClick={() => void calculate()}>{busy ? 'Calculando…' : 'Calcular alcance'}</Button><Button onClick={() => { clear(); onPick(false); onOrigin(null); setReset(x => x + 1); }}>Limpiar</Button></div>
    {error && <p role="alert" className="route-error">{error}</p>}
    {result && <div aria-live="polite"><h3>Hasta {minutes} minutos</h3><p>{(area(result)/1e6).toLocaleString('es-ES',{maximumFractionDigits:1})} km² de contorno aproximado.</p><p>Acceso a carretera: {Math.round(result.access?.distanceMetres??0)} m del origen. Ese acceso no se incluye en el tiempo.</p><Button onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(result)],{type:'application/geo+json'}));const a=document.createElement('a');a.href=url;a.download=`alcance-${minutes}min.geojson`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }}>Exportar GeoJSON</Button></div>}
    <p className="route-caption">El contorno resume accesibilidad por carretera; no significa que puedas circular por cada punto de su interior. No calcula batería, regreso ni tráfico en tiempo real.</p>
    <div className="route-provider"><p>Isócronas: <a href="https://valhalla.openstreetmap.de" target="_blank" rel="noreferrer">Valhalla · FOSSGIS</a>, datos © OpenStreetMap. Servicio público sin garantía de disponibilidad: úsalo de forma moderada. El origen se envía al proveedor al calcular. Búsquedas: Photon.</p></div>
  </section>;
}
