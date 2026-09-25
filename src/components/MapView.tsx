import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { StyleSpecification } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, BitmapLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { Button, Select, Slider, Switch } from 'antd';
import type { PickingInfo, Layer as DeckLayer } from '@deck.gl/core';
import type { Bounds, Collection, Selection, VectorFeature } from '../types.ts';
import type { Layer } from '../model/Layer.ts';
import type { RasterSource } from '../lib/raster.ts';
import { tileUrl } from '../lib/raster.ts';
import { fetchRasterImage } from '../lib/rasterImage.ts';
import type { RouteEndpoint, RouteResult } from '../lib/routing.ts';
maplibregl.setWorkerUrl(mapWorkerUrl);
// deck.gl 9.4's non-interleaved overlay still reads transform.elevation.
// MapLibre 6 removed transform; bridge only that read through its public API.
// This adapter is NOT suitable for interleaved rendering's other transform fields.
class DeckCompatibleMap extends maplibregl.Map {
  get transform() { return { elevation: this.getCenterElevation() }; }
}
export type MapHandle = { fit: (bounds: Bounds) => void; fly: (center: [number, number]) => void };
export type MapMode = 'rectangle' | 'origin' | 'destination' | null;
type Props = {
  layers: Layer[]; rasters: RasterSource[]; onSelection: (selection: Selection | null) => void; onReady: () => void;
  mode: MapMode; interactionId: number; onBounds: (bounds: Bounds) => void; onPoint: (point: [number,number]) => void; onCancel: () => void;
  bounds: Bounds|null; highlighted: Record<string,Collection>; route: RouteResult|null;
  origin: RouteEndpoint|null; destination: RouteEndpoint|null; children?: React.ReactNode;
};
const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e8eff4' } }] };
const styles: Record<string, string | StyleSpecification> = {
  Claro: 'https://tiles.openfreemap.org/styles/positron',
  Oscuro: 'https://tiles.openfreemap.org/styles/dark',
  'Sin fondo': emptyStyle,
};
const rectangle = (b:Bounds) => ({type:'Feature' as const,properties:{},geometry:{type:'Polygon' as const,coordinates:[[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]],[b[0],b[1]]]]}});
const boundsOf = (a:number[],b:number[]):Bounds=>[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];
export const MapView = forwardRef<MapHandle, Props>(function MapView(props, ref) {
  const { layers, rasters, onSelection, children, mode, bounds, highlighted, route, origin, destination }=props;
  const latest=useRef(props);latest.current=props;
  const target = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const initialFit = useRef<Bounds | null>(null);
  const [initialized,setInitialized]=useState(false);
  const [locked, setLocked] = useState(true);
  const [tilted, setTilted] = useState(false);
  const [base, setBase] = useState('Claro');
  const [terrain,setTerrain]=useState(false);const [exaggeration,setExaggeration]=useState(1);
  const terrainRef=useRef({enabled:false,exaggeration:1});terrainRef.current={enabled:terrain,exaggeration};
  const [mapError, setMapError] = useState('');
  const [corner,setCorner]=useState<[number,number]|null>(null);const [preview,setPreview]=useState<Bounds|null>(null);
  const down=useRef<{x:number;y:number;geo:[number,number]}|null>(null);
  const fit = useCallback((b: Bounds) => {
    initialFit.current = b;
    if (b[0] === b[2] && b[1] === b[3]) map.current?.flyTo({ center: [b[0], b[1]], zoom: 14 });
    else map.current?.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 45, maxZoom: 16, duration: 550 });
  }, []);
  useImperativeHandle(ref, () => ({ fit, fly: center => map.current?.flyTo({ center, zoom: 13, duration: 600 }) }), [fit]);
  const applyTerrain=useCallback(()=>{
    const viewer=map.current;if(!viewer?.isStyleLoaded())return;
    try {
      if(!viewer.getSource('terrain-dem')) viewer.addSource('terrain-dem',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'Terrain Tiles · <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noreferrer">Fuentes del relieve</a> · AWS Open Data'});
      viewer.setTerrain(terrainRef.current.enabled?{source:'terrain-dem',exaggeration:terrainRef.current.exaggeration}:null);
    } catch {setMapError('El relieve no pudo activarse. Puedes continuar en 2D.');}
  },[]);
  useEffect(() => {
    if (!target.current) return;
    let viewer: maplibregl.Map;
    try { viewer = new DeckCompatibleMap({ container: target.current, style: styles.Claro, center: [-72.72, -39.88], zoom: 8, bearing: 0, pitch: 0, attributionControl:{compact:true} }); }
    catch { setMapError('No se pudo iniciar WebGL. Comprueba la aceleración gráfica del navegador.'); return; }
    viewer.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    viewer.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    viewer.dragRotate.disable(); viewer.touchZoomRotate.disableRotation(); viewer.keyboard.disableRotation();
    const deck = new MapboxOverlay({ interleaved: false, layers: [], onClick: info => { if (!info.object && !latest.current.mode) latest.current.onSelection(null); } });
    viewer.addControl(deck);
    map.current = viewer; overlay.current = deck;setInitialized(true);
    viewer.on('movestart', () => latest.current.onSelection(null));
    viewer.on('click', event => { if (latest.current.mode === 'origin' || latest.current.mode === 'destination') latest.current.onPoint([event.lngLat.lng,event.lngLat.lat]); });
    viewer.on('moveend', () => setTilted(viewer.getPitch() > 1));
    viewer.on('load', () => { if (initialFit.current) fit(initialFit.current); latest.current.onReady(); });
    viewer.on('style.load',applyTerrain);
    viewer.on('error', () => setMapError('Algún fondo, relieve o servicio externo no ha cargado. Revisa la conexión o usa Sin fondo y desactiva los servicios.'));
    const resize = new ResizeObserver(() => viewer.resize());resize.observe(target.current);
    return () => { resize.disconnect(); viewer.remove(); map.current = null; overlay.current = null; };
  }, [fit,applyTerrain]);
  useEffect(()=>{applyTerrain();},[terrain,exaggeration,applyTerrain]);
  useEffect(()=>{
    setCorner(null);setPreview(null);down.current=null;
    if(mode){setTerrain(false);map.current?.jumpTo({pitch:0,bearing:0});latest.current.onSelection(null);}
  },[mode,props.interactionId]);
  useEffect(() => {
    const click = (info: PickingInfo<VectorFeature>, layerId: string) => {
      if (info.object && !latest.current.mode) onSelection({ layerId, feature: info.object, x: info.x, y: info.y });
    };
    const images=rasters.filter(r=>r.visible).map(source=>new TileLayer<ImageBitmap>({
      id:`raster-${source.id}`,tileSize:256,minZoom:0,maxZoom:19,opacity:source.opacity,maxRequests:4,debounceTime:150,
      getTileData:async ({index,bbox,signal})=>{
        const b=bbox as {west:number;south:number;east:number;north:number};
        return fetchRasterImage(tileUrl(source,index,[b.west,b.south,b.east,b.north]),signal);
      },
      onTileError:error=>{if(error?.name!=='AbortError')setMapError(`${source.name}: ${error instanceof Error?error.message:'No se pudo cargar una tesela.'} Desactiva y activa la fuente para reintentar.`);},
      renderSubLayers: p=>{const b=p.tile.bbox as {west:number;south:number;east:number;north:number};return new BitmapLayer({id:p.id,opacity:source.opacity,image:p.data,bounds:[b.west,b.south,b.east,b.north],pickable:false});},
    }));
    const all:DeckLayer[]=[...images,...layers.map(layer => layer.toDeckLayer(click))];
    Object.entries(highlighted).forEach(([id,data])=>all.push(new GeoJsonLayer({id:`selected-${id}`,data,pickable:false,getFillColor:[255,190,30,65],getLineColor:[255,160,0,255],getLineWidth:4,lineWidthUnits:'pixels',getPointRadius:7,pointRadiusUnits:'pixels',parameters:{depthCompare:'always',depthWriteEnabled:false}})));
    const box=preview??bounds;
    if(box)all.push(new GeoJsonLayer({id:'analysis-box',data:rectangle(box),pickable:false,getFillColor:[15,143,149,25],getLineColor:[0,113,123,255],getLineWidth:2,lineWidthUnits:'pixels',parameters:{depthCompare:'always',depthWriteEnabled:false}}));
    if(route)all.push(new GeoJsonLayer({id:'route',data:{type:'Feature',properties:{},geometry:route.geometry},getLineColor:[38,99,235],getLineWidth:6,lineWidthUnits:'pixels',pickable:false,parameters:{depthCompare:'always',depthWriteEnabled:false}}));
    const ends=[origin?{position:origin.coordinates,text:'A',color:[16,130,94]}:null,destination?{position:destination.coordinates,text:'B',color:[219,65,60]}:null].filter(x=>x!==null);
    all.push(new ScatterplotLayer({id:'route-endpoints',data:ends,getPosition:d=>d.position,getRadius:13,radiusUnits:'pixels',getFillColor:d=>d.color,pickable:false,parameters:{depthCompare:'always'}}),new TextLayer({id:'route-labels',data:ends,getPosition:d=>d.position,getText:d=>d.text,getSize:14,getColor:[255,255,255],getTextAnchor:'middle',getAlignmentBaseline:'center',pickable:false,parameters:{depthCompare:'always'}}));
    overlay.current?.setProps({ layers:all });
  }, [layers,rasters,onSelection,highlighted,bounds,preview,route,origin,destination,initialized]);
  const toggleLock = () => {
    const next = !locked; setLocked(next);const viewer = map.current;if (!viewer) return;
    if (next) { viewer.dragRotate.disable(); viewer.touchZoomRotate.disableRotation(); viewer.keyboard.disableRotation(); viewer.easeTo({ bearing: 0 }); }
    else { viewer.dragRotate.enable(); viewer.touchZoomRotate.enableRotation(); viewer.keyboard.enableRotation(); }
  };
  const geographic=(clientX:number,clientY:number):[number,number]=>{const b=target.current!.getBoundingClientRect();const p=map.current!.unproject([clientX-b.left,clientY-b.top]);return [p.lng,p.lat];};
  const complete=(b:Bounds)=>{if(b[2]-b[0]<1e-8||b[3]-b[1]<1e-8){setMapError('El rectángulo necesita dos esquinas distintas.');return;}setCorner(null);setPreview(null);latest.current.onBounds(b);};
  return <main className="map-wrap"><div ref={target} className="map" aria-label="Mapa geográfico"/>
    <details className="map-settings"><summary>Mapa y relieve</summary><div className="form-stack">
      <label>Mapa base<Select aria-label="Mapa base" value={base} options={Object.keys(styles).map(value => ({ value, label: value }))} onChange={value => { setBase(value); setMapError(''); onSelection(null); map.current?.setStyle(styles[value]); }}/></label>
      <div className="actions"><Button disabled={!!mode} aria-pressed={tilted} onClick={() => map.current?.easeTo({ pitch: tilted ? 0 : 55, duration: 450 })}>{tilted ? 'Vista 2D' : 'Vista 3D'}</Button><Button disabled={!!mode} aria-pressed={!locked} onClick={toggleLock}>{locked ? 'Permitir giro' : 'Fijar norte'}</Button></div>
      <label className="source-title">Terreno con elevación<Switch checked={terrain} disabled={!!mode} aria-label="Activar relieve" onChange={setTerrain}/></label><label>Exageración vertical {exaggeration.toFixed(1)}×<Slider ariaLabelForHandle="Exageración del relieve" min={0.5} max={3} step={0.1} value={exaggeration} onChange={setExaggeration}/></label><p className="muted">Modelo global Terrarium. La vista 3D inclina la cámara; activa el terreno para añadir elevación. Las capas deck.gl no se ajustan a la superficie del terreno. Analiza y elige puntos en 2D.</p>
    </div></details>
    {mode&&<>{mode==='rectangle'&&<div className="selection-surface" aria-label="Superficie de selección del mapa" onPointerDown={e=>{if(!map.current||!e.isPrimary)return;e.currentTarget.setPointerCapture(e.pointerId);down.current={x:e.clientX,y:e.clientY,geo:geographic(e.clientX,e.clientY)};}} onPointerMove={e=>{if(mode!=='rectangle'||!map.current)return;const start=corner??down.current?.geo;if(start)setPreview(boundsOf(start,geographic(e.clientX,e.clientY)));}} onPointerUp={e=>{if(!e.isPrimary)return;const start=down.current;down.current=null;if(!start||!map.current)return;const end=geographic(e.clientX,e.clientY);if(mode!=='rectangle'){latest.current.onPoint(end);return;}if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)complete(boundsOf(corner??start.geo,end));else if(corner)complete(boundsOf(corner,end));else setCorner(end);}} onPointerCancel={()=>{down.current=null;setPreview(null);}}/>}
      <div className="interaction-banner" role="status"><span>{mode==='rectangle'?(corner?'Ahora marca la esquina opuesta.':'Arrastra un rectángulo o toca dos esquinas.'):`Toca el mapa para fijar ${mode==='origin'?'el origen A':'el destino B'}.`}</span><Button onClick={props.onCancel}>Cancelar</Button></div></>}
    {mapError && <div className="map-error" role="alert">{mapError}<button aria-label="Cerrar aviso del mapa" onClick={()=>setMapError('')}>×</button></div>}
    <div className="raster-attributions">{rasters.filter(r=>r.visible).map(r=><span key={r.id}>{r.attribution}</span>)}</div>
    {children}
  </main>;
});



