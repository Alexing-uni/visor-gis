import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Select } from 'antd';
import { fetchGeoJson, MAX_IMPORT_BYTES, parseGeoJson, prepareImport } from '../lib/import.ts';
import type { ImportedLayer } from '../lib/import.ts';

export function ImportPanel({ onImport }: { onImport: (items: ImportedLayer[]) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [crs, setCrs] = useState('EPSG:4326');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const controller = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const run = async () => {
    setBusy(true); setError(''); setSuccess('');
    const active = new AbortController(); controller.current = active;
    try {
      if (file && file.size > MAX_IMPORT_BYTES) throw new Error('El archivo supera el límite de 30 MiB.');
      const raw = file ? parseGeoJson(await file.text()) : await fetchGeoJson(url, active.signal);
      if (active.signal.aborted) return;
      const items = prepareImport(raw, name || file?.name.replace(/\.(geojson|json)$/i, '') || 'Datos importados', crs);
      await onImport(items);
      if (!active.signal.aborted) setSuccess(`${items.reduce((sum, item) => sum + item.data.features.length, 0).toLocaleString('es-ES')} entidades guardadas en ${items.length} capa(s). Ya puedes encuadrarlas en «Capas».`);
    } catch (reason) { if (!active.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { if (!active.signal.aborted) setBusy(false); }
  };
  return <section className="tool-section import-panel" aria-label="Importar datos vectoriales">
    <h2>Importar GeoJSON</h2>
    <p>Archivo o enlace directo a una FeatureCollection. Las colecciones mixtas se separan en puntos, líneas y polígonos.</p>
    <label>Archivo (.geojson, .json)<input ref={fileInput} type="file" accept=".geojson,.json,application/geo+json,application/json" disabled={busy} onChange={event => { setFile(event.target.files?.[0] || null); setError(''); setSuccess(''); }}/></label>
    <label>O enlace directo<Input value={url} disabled={busy || !!file} placeholder="https://servidor/datos.geojson" onChange={event => setUrl(event.target.value)}/></label>
    {file && <Button size="small" disabled={busy} onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ''; }}>Usar enlace en lugar de archivo</Button>}
    <label>Nombre de la capa<Input value={name} maxLength={80} disabled={busy} placeholder={file?.name || 'Datos importados'} onChange={event => setName(event.target.value)}/></label>
    <label>Sistema de coordenadas de origen<Select value={crs} style={{ width: '100%' }} disabled={busy} onChange={setCrs} options={[
      { value: 'EPSG:4326', label: 'WGS84 · longitud, latitud (4326)' },
      { value: 'EPSG:4258', label: 'ETRS89 · longitud, latitud (4258)' },
      { value: 'EPSG:3857', label: 'Web Mercator · metros (3857)' },
      { value: 'EPSG:31994', label: 'SIRGAS 2000 / UTM 19S (31994)' },
    ]}/></label>
    <Button type="primary" block loading={busy} disabled={!file && !url.trim()} onClick={() => void run()}>Importar y guardar</Button>
    {error && <Alert role="alert" type="error" message={error}/>}
    {success && <Alert role="status" type="success" message={success}/>}
    <p className="tool-note">Máximo 30 MiB por archivo. Los datos importados se guardan en este navegador (IndexedDB), también en modo local. Conserva el original: borrar los datos del navegador elimina estas copias.</p>
    <p className="tool-note">Una página con un visor no es un archivo geográfico. WMS y WMTS son imágenes: se registran como fuentes ráster y no añaden entidades al análisis. Shapefile, KML y GeometryCollection requieren conversión previa.</p>
  </section>;
}
