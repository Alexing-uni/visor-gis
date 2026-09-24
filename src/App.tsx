import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import { useLayers } from './hooks/useLayers.ts';
import { LayerCard } from './components/LayerCard.tsx';
import { MapView } from './components/MapView.tsx';
import type { MapHandle } from './components/MapView.tsx';
import { FeaturePopup } from './components/FeaturePopup.tsx';
import { LocationSearch } from './components/LocationSearch.tsx';
import type { Place, Selection } from './types.ts';
import { destination } from './lib/viewport.ts';

export default function App() {
  const { configs, models, errors, loading, fatal, saving, saveError, edit, reorder } = useLayers();
  const viewer = useRef<MapHandle>(null);
  const framed = useRef(false);
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const onReady = useCallback(() => setReady(true), []);
  const onSelection = useCallback((next: Selection | null) => setSelection(next), []);
  useEffect(() => {
    const points = models.find(model => model.id === 'points');
    if (ready && !framed.current && points?.bounds) { framed.current = true; viewer.current?.fit(points.bounds); }
  }, [models, ready]);
  const selectedLayer = models.find(layer => layer.id === selection?.layerId && layer.config.visible && layer.config.opacity > 0);
  const topFirst = [...configs].reverse();
  const move = (index: number, direction: number) => {
    const ids = topFirst.map(layer => layer.id);
    const destination = index + direction;
    if (destination < 0 || destination >= ids.length) return;
    [ids[index], ids[destination]] = [ids[destination], ids[index]];
    onSelection(null); reorder(ids.reverse());
  };
  const drop = (moving: string, target: string) => {
    const ids = topFirst.map(layer => layer.id);
    if (!ids.includes(moving) || moving === target) return;
    const next = ids.filter(id => id !== moving);
    next.splice(ids.indexOf(target), 0, moving);
    onSelection(null); reorder(next.reverse());
  };
  const selectPlace = (place: Place) => {
    const target = destination(place);
    if ('bounds' in target) viewer.current?.fit(target.bounds);
    else viewer.current?.fly(target.center);
  };
  return <div className="app"><aside className="sidebar"><header><span className="eyebrow">VISOR GIS · DECK.GL</span><h1>Explorar el territorio</h1><p>Chile y Asturias</p></header>
    <div className="section-title"><span>CAPAS</span><span>{models.length} / {configs.length || 3}</span></div>
    <p className="region-note">Los puntos y polígonos están en Chile. Encuadra «Viales» para ir a Asturias.</p>
    {fatal && <div className="sidebar-alert"><Alert type="error" message="No se pudo conectar con la API" description={fatal}/><Button onClick={() => window.location.reload()}>Reintentar</Button></div>}
    {saveError && <div className="sidebar-alert"><Alert type="error" message="El cambio no se ha guardado" description={saveError}/></div>}
    <div className="layer-list">{topFirst.map((config, index) => {
      const model = models.find(layer => layer.id === config.id);
      return <LayerCard key={config.id} config={config} count={model?.data.features.length} error={errors[config.id]} busy={saving}
        first={index === 0} last={index === topFirst.length - 1} edit={patch => edit(config.id, patch)} move={direction => move(index, direction)} drop={id => drop(id, config.id)}
        fit={() => { if (model?.bounds) viewer.current?.fit(model.bounds); }}/>;
    })}{loading && <div className="loading"><Spin size="small"/> Cargando y validando datos…</div>}</div>
    <footer><span role="status">{saving ? 'Guardando…' : saveError ? 'Revisa el cambio pendiente' : loading ? 'Leyendo GeoJSON' : 'Configuración guardada'}</span><span>Arrastra ⠿ o usa las flechas para ordenar.</span></footer>
    </aside><MapView ref={viewer} layers={models} onSelection={onSelection} onReady={onReady}>
      <LocationSearch select={selectPlace}/>
      {selection && selectedLayer && <FeaturePopup selection={selection} layer={selectedLayer} close={() => onSelection(null)}/>}
    </MapView></div>;
}
