import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import bbox from '@turf/bbox';
import type { Feature, Polygon } from 'geojson';
import { useLayers } from './hooks/useLayers.ts';
import { LayerCard } from './components/LayerCard.tsx';
import { MapView } from './components/MapView.tsx';
import type { MapHandle, MapMode } from './components/MapView.tsx';
import { FeaturePopup } from './components/FeaturePopup.tsx';
import { LocationSearch } from './components/LocationSearch.tsx';
import { AnalysisPanel } from './components/AnalysisPanel.tsx';
import { RoutePanel } from './components/RoutePanel.tsx';
import { ImportPanel } from './components/ImportPanel.tsx';
import { SourcesPanel } from './components/SourcesPanel.tsx';
import { analyzeLayers } from './lib/analysis.ts';
import type { RouteEndpoint, RouteEndpointKind, RouteResult } from './lib/routing.ts';
import { officialSources, validateRaster } from './lib/raster.ts';
import type { RasterSource } from './lib/raster.ts';
import type { Bounds, Place, Selection } from './types.ts';
import { destination as placeDestination } from './lib/viewport.ts';
type Tab='layers'|'analysis'|'routes'|'sources'|'import';
const tabs:{id:Tab;label:string;icon:string}[]=[{id:'layers',label:'Capas',icon:'▱'},{id:'analysis',label:'Análisis',icon:'▧'},{id:'routes',label:'Rutas',icon:'↝'},{id:'sources',label:'Fuentes',icon:'◉'},{id:'import',label:'Importar',icon:'＋'}];
function readRasters():RasterSource[]{try{const raw=localStorage.getItem('visor-gis:rasters:v1');if(!raw)return officialSources;const parsed=JSON.parse(raw);if(!Array.isArray(parsed))return officialSources;return parsed.map(validateRaster);}catch{return officialSources;}}
export default function App() {
  const { configs, models, errors, loading, fatal, saving, saveError, edit, reorder, storageMode, importedIds, addImported, removeImported } = useLayers();
  const viewer = useRef<MapHandle>(null);const framed = useRef(false);
  const [ready,setReady]=useState(false);const [selection,setSelection]=useState<Selection|null>(null);
  const [tab,setTab]=useState<Tab>('layers');const [open,setOpen]=useState(true);const [width,setWidth]=useState(370);
  const [mode,setMode]=useState<MapMode>(null);const [bounds,setBounds]=useState<Bounds|null>(null);
  const [interactionId,setInteractionId]=useState(0);
  const [polygon,setPolygon]=useState<Feature<Polygon>|null>(null);
  const [origin,setOrigin]=useState<RouteEndpoint|null>(null);const [destination,setDestination]=useState<RouteEndpoint|null>(null);const [route,setRoute]=useState<RouteResult|null>(null);
  const [rasters,setRasters]=useState(readRasters);const [localError,setLocalError]=useState('');
  const onReady=useCallback(()=>setReady(true),[]);const onSelection=useCallback((next:Selection|null)=>setSelection(next),[]);
  const analysis=useMemo(()=>{if(!bounds&&!polygon)return {result:null,error:''};try{const result=analyzeLayers(models,polygon??bounds!);const missing=configs.filter(c=>c.visible&&c.opacity>0&&!models.some(m=>m.id===c.id));if(missing.length)result.warnings.push('Resultado parcial: faltan capas visibles sin cargar: '+missing.map(c=>c.name).join(', ')+'. Revisa sus errores en Capas.');if(loading)result.warnings.push('La carga de capas no ha terminado; el resultado puede cambiar.');return {result,error:''};}catch(error){return {result:null,error:String(error instanceof Error?error.message:error)};}},[models,bounds,polygon,configs,loading]);
  useEffect(()=>{const points=models.find(model=>model.id==='points');if(ready&&!framed.current&&points?.bounds){framed.current=true;viewer.current?.fit(points.bounds);}},[models,ready]);
  const selectedLayer=models.find(layer=>layer.id===selection?.layerId&&layer.config.visible&&layer.config.opacity>0);
  const topFirst=[...configs].reverse();
  const move=(index:number,direction:number)=>{const ids=topFirst.map(l=>l.id),target=index+direction;if(target<0||target>=ids.length)return;[ids[index],ids[target]]=[ids[target],ids[index]];setSelection(null);reorder(ids.reverse());};
  const drop=(moving:string,target:string)=>{const ids=topFirst.map(l=>l.id);if(!ids.includes(moving)||moving===target)return;const next=ids.filter(id=>id!==moving);next.splice(ids.indexOf(target),0,moving);setSelection(null);reorder(next.reverse());};
  const selectPlace=(place:Place)=>{const target=placeDestination(place);if('bounds'in target)viewer.current?.fit(target.bounds);else viewer.current?.fly(target.center);};
  const startMode=(next:MapMode)=>{setInteractionId(i=>i+1);setMode(next);if(next==='rectangle'||next==='polygon'){setBounds(null);setPolygon(null);}if(next){setSelection(null);if(window.matchMedia('(max-width: 800px)').matches)setOpen(false);}};
  const endpoint=(kind:RouteEndpointKind,point:RouteEndpoint|null)=>{setRoute(null);if(kind==='origin')setOrigin(point);else setDestination(point);if(point)viewer.current?.fly(point.coordinates);};
  const onRoute=(next:RouteResult|null)=>{setRoute(next);if(next)viewer.current?.fit(bbox(next.geometry) as Bounds);};
  const changeSources=(next:RasterSource[])=>{setRasters(next);try{localStorage.setItem('visor-gis:rasters:v1',JSON.stringify(next));setLocalError('');}catch{setLocalError('No se han podido guardar las preferencias de servicios en este navegador.');}};
  return <div className={`app ${open?'panel-open':'panel-closed'} ${mode?'interacting':''}`} style={{'--panel-width':`${width}px`} as React.CSSProperties}>
    <nav className="rail" aria-label="Herramientas"><div className="brand" title="Visor GIS">G<span>·</span></div>{tabs.map(item=><button key={item.id} title={item.label} aria-label={item.label} aria-pressed={open&&tab===item.id} onClick={()=>{setTab(item.id);setOpen(!(open&&tab===item.id));setMode(null);}}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}<span className="version">0.4</span></nav>
    <aside className="sidebar" aria-label="Panel de herramientas" hidden={!open}><header><div><span className="eyebrow">ATLAS DE TRABAJO</span><h1>Explorar el territorio</h1><p>Chile · Asturias · tus datos</p></div><button className="close-panel" aria-label="Plegar panel" onClick={()=>setOpen(false)}>‹</button></header>
      <div className="panel-body">
      {fatal&&<Alert type="error" message="No se pudieron cargar las capas" description={fatal} action={<Button onClick={()=>window.location.reload()}>Reintentar</Button>}/>}
      {(saveError||localError)&&<Alert type="error" message="Hay un cambio sin guardar" description={saveError||localError}/>}
      <section hidden={tab!=='layers'}><div className="section-title"><span>CAPAS VECTORIALES</span><span>{models.length} / {configs.length||3}</span></div><p className="region-note">Los puntos y la geología están en Chile; los viales, en Asturias. Usa Encuadrar para viajar a cada capa.</p><div className="layer-list">{topFirst.map((config,index)=>{const model=models.find(l=>l.id===config.id);return <div key={config.id}><LayerCard config={config} count={model?.data.features.length} error={errors[config.id]} busy={saving} first={index===0} last={index===topFirst.length-1} edit={patch=>edit(config.id,patch)} move={direction=>move(index,direction)} drop={id=>drop(id,config.id)} fit={()=>{if(model?.bounds)viewer.current?.fit(model.bounds);}}/>{importedIds.includes(config.id)&&<Button size="small" className="remove-import" onClick={()=>void removeImported(config.id).catch(e=>setLocalError(String(e.message)))}>Quitar capa importada</Button>}</div>;})}{loading&&<div className="loading"><Spin size="small"/>Cargando y validando datos…</div>}</div></section>
      <section hidden={tab!=='analysis'}><AnalysisPanel selecting={mode==='rectangle'||mode==='polygon'?mode:null} onStart={startMode} onClear={()=>{setBounds(null);setPolygon(null);setMode(null);}} result={analysis.result}/>{analysis.error&&<Alert type="error" message={analysis.error}/>}</section>
      <section hidden={tab!=='routes'}><RoutePanel origin={origin} destination={destination} route={route} picking={mode==='origin'||mode==='destination'?mode:null} onEndpoint={endpoint} onSwap={()=>{setOrigin(destination);setDestination(origin);setRoute(null);setMode(null);}} onRoute={onRoute} onPick={startMode}/></section>
      <section hidden={tab!=='sources'}><SourcesPanel sources={rasters} onChange={changeSources} fit={b=>viewer.current?.fit(b)}/></section>
      <section hidden={tab!=='import'}><ImportPanel onImport={addImported}/></section>
      </div><footer><span role="status">{saving?'Guardando…':saveError?'Cambio sin guardar':loading?'Leyendo GeoJSON':storageMode==='browser'?'Modo Pages · almacenamiento en este navegador':'Modo local · SQLite y navegador'}</span><span>Estilos, orden y visibilidad por capa.</span></footer>
      <div className="panel-resizer" role="separator" aria-label="Anchura del panel" aria-orientation="vertical" aria-valuemin={310} aria-valuemax={580} aria-valuenow={width} tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowRight')setWidth(w=>Math.min(580,w+20));if(e.key==='ArrowLeft')setWidth(w=>Math.max(310,w-20));}} onPointerDown={e=>e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e=>{if(e.buttons===1)setWidth(Math.max(310,Math.min(580,e.clientX-76)));}}/>
    </aside>
    <MapView ref={viewer} layers={models} rasters={rasters} onSelection={onSelection} onReady={onReady} mode={mode} interactionId={interactionId} onCancel={()=>{setMode(null);setOpen(true);}} bounds={bounds} polygon={polygon} onPolygon={p=>{setPolygon(p);setBounds(null);setMode(null);setTab('analysis');setOpen(true);}} highlighted={analysis.result?.selectedByLayer??{}} route={route} origin={origin} destination={destination} onBounds={b=>{setPolygon(null);setBounds(b);setMode(null);setTab('analysis');setOpen(true);}} onPoint={point=>{if(mode==='origin'||mode==='destination')endpoint(mode,{coordinates:point,label:`${point[1].toFixed(5)}, ${point[0].toFixed(5)}`});setMode(null);setTab('routes');setOpen(true);}}>
      {!mode&&<LocationSearch select={selectPlace}/>}
      {!mode&&<details className="legend"><summary>Leyenda</summary>{models.filter(m=>m.config.visible&&m.config.opacity>0).map(m=><div key={m.id}><span style={{background:m.config.kind==='line'?m.config.stroke:m.config.fill,borderColor:m.config.stroke,opacity:m.config.opacity}} className={`legend-symbol ${m.config.kind}`}/>{m.name}</div>)}{(bounds||polygon)&&<div><span className="legend-selected"/>Selección de análisis</div>}{route&&<div><span className="legend-route"/>Ruta en coche</div>}<p>Radios y grosores en píxeles.</p></details>}
      {selection&&selectedLayer&&!mode&&<FeaturePopup selection={selection} layer={selectedLayer} close={()=>onSelection(null)}/>}
    </MapView>
  </div>;
}

