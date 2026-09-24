import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { Button, Select } from 'antd';
import type { PickingInfo } from '@deck.gl/core';
import type { Bounds, Selection, VectorFeature } from '../types.ts';
import type { Layer } from '../model/Layer.ts';
export type MapHandle = { fit: (bounds: Bounds) => void; fly: (center: [number, number]) => void };
type Props = { layers: Layer[]; onSelection: (selection: Selection | null) => void; onReady: () => void; children?: React.ReactNode };
const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e8eff4' } }] };
const styles: Record<string, string | StyleSpecification> = {
  Claro: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  Oscuro: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  'Sin fondo': emptyStyle,
};
export const MapView = forwardRef<MapHandle, Props>(function MapView({ layers, onSelection, onReady, children }, ref) {
  const target = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const initialFit = useRef<Bounds | null>(null);
  const [locked, setLocked] = useState(true);
  const [tilted, setTilted] = useState(false);
  const [base, setBase] = useState('Claro');
  const [mapError, setMapError] = useState('');
  const fit = useCallback((bounds: Bounds) => {
    initialFit.current = bounds;
    if (bounds[0] === bounds[2] && bounds[1] === bounds[3]) map.current?.flyTo({ center: [bounds[0], bounds[1]], zoom: 14 });
    else map.current?.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 65, maxZoom: 16, duration: 650 });
  }, []);
  useImperativeHandle(ref, () => ({ fit, fly: center => map.current?.flyTo({ center, zoom: 13, duration: 700 }) }), [fit]);
  useEffect(() => {
    if (!target.current) return;
    let viewer: maplibregl.Map;
    try { viewer = new maplibregl.Map({ container: target.current, style: styles.Claro, center: [-72.72, -39.88], zoom: 8, bearing: 0, pitch: 0 }); }
    catch { setMapError('No se pudo iniciar WebGL. Comprueba la aceleración gráfica del navegador.'); return; }
    viewer.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    viewer.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    viewer.dragRotate.disable(); viewer.touchZoomRotate.disableRotation(); viewer.keyboard.disableRotation();
    const deck = new MapboxOverlay({ interleaved: false, layers: [], onClick: info => { if (!info.object) onSelection(null); } });
    viewer.addControl(deck);
    map.current = viewer; overlay.current = deck;
    viewer.on('movestart', () => onSelection(null));
    viewer.on('moveend', () => setTilted(viewer.getPitch() > 1));
    viewer.on('load', () => { if (initialFit.current) fit(initialFit.current); onReady(); });
    viewer.on('error', () => setMapError('No se pudo cargar algún recurso cartográfico. Prueba «Sin fondo» para ver las capas locales.'));
    const resize = new ResizeObserver(() => viewer.resize());
    resize.observe(target.current);
    return () => { resize.disconnect(); viewer.remove(); map.current = null; overlay.current = null; };
  }, [fit, onReady, onSelection]);
  useEffect(() => {
    const click = (info: PickingInfo<VectorFeature>, layerId: string) => {
      if (info.object) onSelection({ layerId, feature: info.object, x: info.x, y: info.y });
    };
    overlay.current?.setProps({ layers: layers.map(layer => layer.toDeckLayer(click)) });
  }, [layers, onSelection]);
  const toggleLock = () => {
    const next = !locked; setLocked(next);
    const viewer = map.current;
    if (!viewer) return;
    if (next) { viewer.dragRotate.disable(); viewer.touchZoomRotate.disableRotation(); viewer.keyboard.disableRotation(); viewer.easeTo({ bearing: 0 }); }
    else { viewer.dragRotate.enable(); viewer.touchZoomRotate.enableRotation(); viewer.keyboard.enableRotation(); }
  };
  return <main className="map-wrap"><div ref={target} className="map" aria-label="Mapa geográfico"/>
    <div className="map-tools">
      <Select aria-label="Mapa base" value={base} style={{ width: 120 }} options={Object.keys(styles).map(value => ({ value, label: value }))}
        onChange={value => { setBase(value); setMapError(''); onSelection(null); map.current?.setStyle(styles[value]); }}/>
      <Button aria-pressed={tilted} onClick={() => map.current?.easeTo({ pitch: tilted ? 0 : 55, duration: 450 })}>{tilted ? 'Vista 2D' : 'Vista 3D'}</Button>
      <Button aria-pressed={locked} onClick={toggleLock}>{locked ? 'Desbloquear giro' : 'Bloquear giro'}</Button>
      <Button disabled={locked} onClick={() => map.current?.easeTo({ bearing: 0 })}>Norte</Button>
    </div>
    {mapError && <div className="map-error" role="alert">{mapError}</div>}
    {children}
  </main>;
});
