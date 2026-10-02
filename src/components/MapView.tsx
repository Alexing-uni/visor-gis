import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, BitmapLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { TileLayer, TerrainLayer, MVTLayer } from '@deck.gl/geo-layers';
import { _TerrainExtension as TerrainExtension } from '@deck.gl/extensions';
import { TerrainLoader } from '@loaders.gl/terrain';
import terrainWorkerUrl from '@loaders.gl/terrain/terrain-worker.js?url';
import { MVTLoader } from '@loaders.gl/mvt';
import mvtWorkerUrl from '@loaders.gl/mvt/mvt-worker.js?url';
import { groundCoordinates, terrainDecoder } from '../lib/elevation.ts';
import { buildingDimensions, prepareBuildings } from '../lib/buildings.ts';
import { BasemapToneExtension } from '../lib/basemapTone.ts';
import { backgroundFor, emptyStyle, styles } from '../lib/basemaps.ts';
import { createTerrainFetch } from '../lib/terrainSource.ts';
import { createSatelliteFetcher } from '../lib/satelliteSource.ts';
import type { ServiceArea } from '../lib/serviceArea.ts';
import { Button, Select, Slider, Switch } from 'antd';
import type { PickingInfo, Layer as DeckLayer } from '@deck.gl/core';
import type { Feature, Polygon } from 'geojson';
import { selectionPolygon } from '../lib/analysis.ts';
import type { Bounds, Collection, Selection, VectorFeature } from '../types.ts';
import type { Layer } from '../model/Layer.ts';
import type { RasterSource } from '../lib/raster.ts';
import { tileUrl, activeRasters, updateRaster } from '../lib/raster.ts';
import { fetchRasterImage } from '../lib/rasterImage.ts';
import type { RouteEndpoint, RouteResult } from '../lib/routing.ts';
maplibregl.setWorkerUrl(mapWorkerUrl);
const fetchSatellite=createSatelliteFetcher();
// MapLibre's flat background and deck.gl's terrain texture share the same
// sparse-coverage fallback and cache. The protocol is local, not a proxy server.
maplibregl.addProtocol('visor-satellite',async (request,controller)=>{
  const match=/^visor-satellite:\/\/tiles\/(\d+)\/(\d+)\/(\d+)$/.exec(request.url);
  if(!match)throw new Error('Dirección de tesela satélite inválida.');
  return {data:await fetchSatellite({z:Number(match[1]),x:Number(match[2]),y:Number(match[3])},controller.signal)};
});
// deck.gl 9.4's non-interleaved overlay still reads transform.elevation.
// MapLibre 6 removed transform; bridge only that read through its public API.
// This adapter is NOT suitable for interleaved rendering's other transform fields.
class DeckCompatibleMap extends maplibregl.Map {
  get transform() { return { elevation: this.getCenterElevation() }; }
}
export type MapHandle = { fit: (bounds: Bounds) => void; fly: (center: [number, number]) => void };
export type MapMode = 'rectangle' | 'polygon' | 'origin' | 'destination' | 'reach-origin' | null;
type Props = {
  serviceArea: ServiceArea|null; reachOrigin: RouteEndpoint|null;
  layers: Layer[]; rasters: RasterSource[]; onRastersChange: (sources: RasterSource[]) => void; onOpenSettings: () => void; onSelection: (selection: Selection | null) => void; onReady: () => void;
  mode: MapMode; interactionId: number; onBounds: (bounds: Bounds) => void; onPoint: (point: [number,number]) => void; onCancel: () => void;
  bounds: Bounds|null; highlighted: Record<string,Collection>; route: RouteResult|null;
  polygon: Feature<Polygon>|null; onPolygon: (polygon: Feature<Polygon>) => void;
  origin: RouteEndpoint|null; destination: RouteEndpoint|null; children?: React.ReactNode;
};
const rectangle = (b:Bounds) => ({type:'Feature' as const,properties:{},geometry:{type:'Polygon' as const,coordinates:[[[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]],[b[0],b[1]]]]}});
const boundsOf = (a:number[],b:number[]):Bounds=>[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];
export const MapView = forwardRef<MapHandle, Props>(function MapView(props, ref) {
  const { serviceArea, reachOrigin, layers, rasters, onSelection, children, mode, bounds, polygon, highlighted, route, origin, destination }=props;
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
  const [terrainProvider,setTerrainProvider]=useState<'Mapterhorn'|'AWS'>('Mapterhorn');
  const terrainFetch=useMemo(()=>createTerrainFetch(),[]);
  const [buildings,setBuildings]=useState(false);
  const [offsetSupported,setOffsetSupported]=useState<boolean|null>(null);
  const decoder=useMemo(()=>terrainDecoder(exaggeration),[exaggeration]);
  const displayedRasters=activeRasters(rasters);
  const rasterBase=displayedRasters.find(r=>r.role==='base');
  const effectiveBase=backgroundFor(base,rasterBase);
  const [mapError, setMapError] = useState('');
  const [corner,setCorner]=useState<[number,number]|null>(null);const [preview,setPreview]=useState<Bounds|null>(null);
  const [vertices,setVertices]=useState<[number,number][]>([]);
  const verticesRef=useRef(vertices);verticesRef.current=vertices;
  const closePolygon=useCallback(()=>{
    try { const completed=selectionPolygon(verticesRef.current);setMapError('');latest.current.onPolygon(completed); }
    catch(error) {setMapError(error instanceof Error?error.message:'No se pudo cerrar el polígono.');}
  },[]);
  const down=useRef<{x:number;y:number;geo:[number,number]}|null>(null);
  const fit = useCallback((b: Bounds) => {
    initialFit.current = b;
    if (b[0] === b[2] && b[1] === b[3]) map.current?.flyTo({ center: [b[0], b[1]], zoom: 14 });
    else {
      const mobilePanel=window.matchMedia('(max-width: 800px)').matches&&target.current?.closest('.app')?.classList.contains('panel-open');
      const padding=mobilePanel?{top:85,bottom:Math.min((target.current?.clientHeight??700)*0.6,window.innerHeight*0.46+24),left:24,right:24}:45;
      map.current?.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding, maxZoom: 16, duration: 550 });
    }
  }, []);
  useImperativeHandle(ref, () => ({ fit, fly: center => map.current?.flyTo({ center, zoom: 13, duration: 600 }) }), [fit]);
  useEffect(() => {
    if (!target.current) return;
    let viewer: maplibregl.Map;
    try { viewer = new DeckCompatibleMap({ container: target.current, style: emptyStyle, center: [-72.72, -39.88], zoom: 8, bearing: 0, pitch: 0, attributionControl:{compact:true} }); }
    catch { setMapError('No se pudo iniciar WebGL. Comprueba la aceleración gráfica del navegador.'); return; }
    viewer.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    viewer.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    viewer.dragRotate.disable(); viewer.touchZoomRotate.disableRotation(); viewer.keyboard.disableRotation();
    const deck = new MapboxOverlay({ interleaved: false, layers: [],
      onDeviceInitialized: device => setOffsetSupported(device.isTextureFormatRenderable('rgba32float')),
      onError: error => setMapError(`No se pudo dibujar una capa: ${error.message}`),
      onClick: info => { if (!info.object && !latest.current.mode) latest.current.onSelection(null); } });
    viewer.addControl(deck);
    map.current = viewer; overlay.current = deck;setInitialized(true);
    viewer.on('movestart', () => latest.current.onSelection(null));
    viewer.on('click', event => {
      if (latest.current.mode === 'origin' || latest.current.mode === 'destination' || latest.current.mode === 'reach-origin') latest.current.onPoint([event.lngLat.lng,event.lngLat.lat]);
      if (latest.current.mode === 'polygon') {
        const points=verticesRef.current;
        if(points.length>=3) {const first=viewer.project(points[0]);if(Math.hypot(event.point.x-first.x,event.point.y-first.y)<=18){closePolygon();return;}}
        const point:[number,number]=[event.lngLat.lng,event.lngLat.lat];
        if(points.length&&points.at(-1)![0]===point[0]&&points.at(-1)![1]===point[1])return;
        setMapError('');setVertices([...points,point]);
      }
    });
    viewer.on('moveend', () => setTilted(viewer.getPitch() > 1));
    viewer.on('load', () => { if (initialFit.current) fit(initialFit.current); latest.current.onReady(); });

    viewer.on('error', () => setMapError('Algún fondo, relieve o servicio externo no ha cargado. Revisa la conexión o usa Sin fondo y desactiva los servicios.'));
    const resize = new ResizeObserver(() => viewer.resize());resize.observe(target.current);
    return () => { resize.disconnect(); viewer.remove(); map.current = null; overlay.current = null; };
  }, [fit,closePolygon]);
  // Keep the global background beneath regional imagery: transparent/no-data pixels reveal it.
  useEffect(()=>{ if(initialized){map.current?.setStyle(terrain ? emptyStyle : styles[effectiveBase],{diff:false});} },[terrain,effectiveBase,initialized]);
  useEffect(()=>{
    setCorner(null);setPreview(null);setVertices([]);down.current=null;
    if(mode){setTerrain(false);map.current?.jumpTo({pitch:0,bearing:0});latest.current.onSelection(null);}
  },[mode,props.interactionId]);
  useEffect(() => {
    const click = (info: PickingInfo<VectorFeature>, layerId: string) => {
      if (info.object && !latest.current.mode) onSelection({ layerId, feature: layers.find(l=>l.id===layerId)?.data.features[info.index]??info.object, x: info.x, y: info.y });
    };
    const images=activeRasters(rasters).map(source=>new TileLayer<ImageBitmap>({
      id:`raster-${source.id}`,extent:source.bounds,tileSize:256,minZoom:0,maxZoom:19,opacity:source.opacity,maxRequests:4,debounceTime:150,
      getTileData:async ({index,bbox,signal})=>{
        const b=bbox as {west:number;south:number;east:number;north:number};
        return fetchRasterImage(tileUrl(source,index,[b.west,b.south,b.east,b.north]),signal);
      },
      onTileError:error=>{if(error?.name!=='AbortError')setMapError(`${source.name}: ${error instanceof Error?error.message:'No se pudo cargar una tesela.'} Desactiva y activa la fuente para reintentar.`);},
      renderSubLayers: p=>{const b=p.tile.bbox as {west:number;south:number;east:number;north:number};return new BitmapLayer({...p,data:undefined,id:p.id,opacity:source.opacity,image:p.data,bounds:[b.west,b.south,b.east,b.north],pickable:false});},
    }));
    const all:DeckLayer[]=[...images,...layers.map(layer => layer.toDeckLayer(click).clone({data:groundCoordinates(layer.data)}))];
    if(serviceArea)all.push(new GeoJsonLayer({id:'service-area',data:serviceArea,pickable:false,getFillColor:[126,68,196,65],getLineColor:[106,43,170,255],getLineWidth:3,lineWidthUnits:'pixels'}));
    Object.entries(highlighted).forEach(([id,data])=>all.push(new GeoJsonLayer({id:`selected-${id}`,data:groundCoordinates(data),pickable:false,getFillColor:[255,190,30,65],getLineColor:[255,160,0,255],getLineWidth:4,lineWidthUnits:'pixels',getPointRadius:7,pointRadiusUnits:'pixels',parameters:{depthCompare:'always',depthWriteEnabled:false}})));
    const box=preview??bounds;
    if(box)all.push(new GeoJsonLayer({id:'analysis-box',data:rectangle(box),pickable:false,getFillColor:[15,143,149,25],getLineColor:[0,113,123,255],getLineWidth:2,lineWidthUnits:'pixels',parameters:{depthCompare:'always',depthWriteEnabled:false}}));
    if(polygon)all.push(new GeoJsonLayer({id:'analysis-polygon',data:polygon,pickable:false,getFillColor:[15,143,149,25],getLineColor:[0,113,123,255],getLineWidth:2,lineWidthUnits:'pixels',parameters:{depthCompare:'always',depthWriteEnabled:false}}));
    if(mode==='polygon') {
      if(vertices.length>=2)all.push(new GeoJsonLayer({id:'analysis-draft',data:{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:vertices}},pickable:false,getLineColor:[0,113,123,255],getLineWidth:3,lineWidthUnits:'pixels',parameters:{depthCompare:'always'}}));
      all.push(new ScatterplotLayer({id:'analysis-vertices',data:vertices,getPosition:p=>p,getRadius:8,radiusUnits:'pixels',getFillColor:(_,info)=>info.index===0?[255,180,30,255]:[0,113,123,255],stroked:true,getLineColor:[255,255,255,255],getLineWidth:2,lineWidthUnits:'pixels',pickable:false,parameters:{depthCompare:'always'}}));
    }
    if(route)all.push(new GeoJsonLayer({id:'route',data:{type:'Feature',properties:{},geometry:route.geometry},getLineColor:[38,99,235],getLineWidth:6,lineWidthUnits:'pixels',pickable:false,parameters:{depthCompare:'always',depthWriteEnabled:false}}));
    const ends=[reachOrigin?{position:reachOrigin.coordinates,text:'◎',color:[106,43,170]}:null,origin?{position:origin.coordinates,text:'A',color:[16,130,94]}:null,destination?{position:destination.coordinates,text:'B',color:[219,65,60]}:null].filter(x=>x!==null);
    all.push(new ScatterplotLayer({id:'route-endpoints',data:ends,getPosition:d=>d.position,getRadius:13,radiusUnits:'pixels',getFillColor:d=>d.color,pickable:false,parameters:{depthCompare:'always'}}),new TextLayer({id:'route-labels',data:ends,getPosition:d=>d.position,getText:d=>d.text,getSize:14,getColor:[255,255,255],getTextAnchor:'middle',getAlignmentBaseline:'center',pickable:false,parameters:{depthCompare:'always'}}));
    const surfaceProps={extensions:[new TerrainExtension()],terrainDrawMode:'drape' as const};
    // Changing mode creates fresh layers: TerrainExtension must initialize its effect,
    // and its drape state must not survive when returning to a flat MapLibre background.
    const fitted = all.map(layer => layer.clone({id:`${layer.id}-${terrain?'on-ground':'flat'}`,...(terrain?surfaceProps:{})}));
    // Imagery has an independent zoom range from elevation. PNOA always uses
    // global satellite images below its coverage, with no inherited dark filter.
    const satellite=effectiveBase==='Satélite';
    const toned=effectiveBase==='Claro'||effectiveBase==='Oscuro';
    if(terrain&&effectiveBase!=='Sin fondo')fitted.unshift(new TileLayer<ImageBitmap>({
      id:`global-base-${effectiveBase}`,tileSize:satellite?512:256,minZoom:0,maxZoom:19,maxRequests:4,debounceTime:150,
      ...surfaceProps,extensions:[new TerrainExtension(),...(toned?[new BasemapToneExtension({dark:effectiveBase==='Oscuro'})]:[])],
      getTileData:({index,signal})=>satellite?fetchSatellite(index,signal):fetchRasterImage(`https://tile.openstreetmap.org/${index.z}/${index.x}/${index.y}.png`,signal),
      renderSubLayers:p=>{const b=p.tile.bbox as {west:number;south:number;east:number;north:number};return new BitmapLayer({...p,data:undefined,image:p.data,bounds:[b.west,b.south,b.east,b.north],pickable:false});},
      onTileError:error=>{if(error?.name!=='AbortError')setMapError(`No se pudo cargar el fondo 3D de ${satellite?'VersaTiles':'OpenStreetMap'}. Comprueba la conexión o vuelve a 2D.`);}
    }));
    if(terrain) fitted.unshift(new TerrainLayer({
      id:`ground-${terrainProvider}`, elevationData:terrainProvider==='Mapterhorn'?'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp':'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
      elevationDecoder:decoder, minZoom:0, maxZoom:terrainProvider==='Mapterhorn'?16:14, tileSize:terrainProvider==='Mapterhorn'?512:256, meshMaxError:2,
      maxRequests:2,maxCacheSize:32,...(terrainProvider==='Mapterhorn'?{fetch:terrainFetch}:{}),
      refinementStrategy:'no-overlap', operation:'terrain+draw', pickable:false,
      color:[255,255,255], material:{ambient:1,diffuse:0,shininess:32,specularColor:[0,0,0]},
      loaders:[TerrainLoader], loadOptions:{worker:true,maxConcurrency:2,terrain:{workerUrl:terrainWorkerUrl}},
      onTileError:error=>{if(error?.name!=='AbortError')setMapError(`No se pudo cargar el relieve ${terrainProvider}. Revisa la conexión, cambia de proveedor o vuelve a 2D.`);}
    }));
    // Extrusions must use offset, not the drape mode used by lines, routes and images.
    if(buildings&&(terrain||tilted)&&(!terrain||offsetSupported===true))fitted.push(new MVTLayer({
      id:`buildings-${terrain?'terrain':'flat'}-${effectiveBase}`,data:'https://tiles.openfreemap.org/planet',
      binary:false,minZoom:14,maxZoom:14,maxCacheSize:32,pickable:false,
      extruded:true,filled:true,stroked:false,
      getElevation:feature=>buildingDimensions(feature)?.extrusion??0,
      getFillColor:effectiveBase==='Oscuro'?[101,122,143,255]:[209,217,226,255],
      material:{ambient:0.65,diffuse:0.6,shininess:32,specularColor:[0,0,0]},
      loaders:[MVTLoader],loadOptions:{worker:true,maxConcurrency:2,mvt:{layers:['building'],workerUrl:mvtWorkerUrl}},
      ...(terrain?{extensions:[new TerrainExtension()],terrainDrawMode:'offset' as const}:{}),
      // binary:false above makes loaded tile data a GeoJSON Feature array.
      renderSubLayers:p=>new GeoJsonLayer({...p,data:prepareBuildings(Array.isArray(p.data)?p.data as Feature[]:[])}),
      onTileError:error=>{if(error?.name!=='AbortError')setMapError(`Edificios OpenFreeMap: ${error.message??'No se pudo cargar una tesela'}. Desactiva y activa Edificios 3D para reintentar.`);}
    }));
    overlay.current?.setProps({ layers:fitted });
  }, [layers,rasters,onSelection,highlighted,bounds,polygon,preview,vertices,mode,route,origin,destination,initialized,terrain,exaggeration,effectiveBase,serviceArea,reachOrigin,decoder,buildings,tilted,offsetSupported,terrainProvider,terrainFetch]);
  const toggleLock = () => {
    const next = !locked; setLocked(next);const viewer = map.current;if (!viewer) return;
    if (next) { viewer.dragRotate.disable(); viewer.touchZoomRotate.disableRotation(); viewer.keyboard.disableRotation(); viewer.easeTo({ bearing: 0 }); }
    else { viewer.dragRotate.enable(); viewer.touchZoomRotate.enableRotation(); viewer.keyboard.enableRotation(); }
  };
  const geographic=(clientX:number,clientY:number):[number,number]=>{const b=target.current!.getBoundingClientRect();const p=map.current!.unproject([clientX-b.left,clientY-b.top]);return [p.lng,p.lat];};
  const complete=(b:Bounds)=>{if(b[2]-b[0]<1e-8||b[3]-b[1]<1e-8){setMapError('El rectángulo necesita dos esquinas distintas.');return;}setCorner(null);setPreview(null);latest.current.onBounds(b);};
  return <main className="map-wrap"><div ref={target} className="map" aria-label="Mapa geográfico"/>
    <details className="map-settings" onToggle={event=>{if(event.currentTarget.open)props.onOpenSettings();}}><summary>Mapa y relieve</summary><div className="form-stack">
      <label>Mapa base<Select aria-label="Mapa base" value={rasterBase?.id??base} options={[
        {value:'Claro',label:'Claro'},{value:'Oscuro',label:'Oscuro'},{value:'Cartográfico',label:'Cartográfico en color'},{value:'Satélite',label:'Satélite global'},
        ...rasters.filter(r=>r.id==='pnoa'||r.role==='base').map(r=>({value:r.id,label:r.name})),
        {value:'Sin fondo',label:'Sin fondo'}
      ]} onChange={value=>{
        if(value in styles){setBase(value);props.onRastersChange(rasters.map(r=>r.role==='base'?{...r,visible:false}:r));}
        else props.onRastersChange(updateRaster(rasters,value,{visible:true,role:'base',opacity:1}));
        setMapError('');onSelection(null);
      }}/></label>
      {rasterBase&&<><p className="muted">{rasterBase.id==='pnoa'?'PNOA sobre imágenes globales: fuera de España se mantiene el fondo satélite, sin heredar el modo oscuro.':`${rasterBase.name}: se conserva el fondo global fuera de la cobertura.`} Los ríos y las capas de datos siguen visibles.</p>{rasterBase.bounds&&<Button onClick={()=>fit(rasterBase.bounds!)}>Ver cobertura</Button>}</>}
      <div className="actions"><Button disabled={!!mode} aria-pressed={terrain||tilted} onClick={() => {const enable=!(terrain||tilted);setTerrain(enable);map.current?.easeTo({ pitch: enable ? 55 : 0, duration: 450 });}}>{terrain||tilted ? 'Vista 2D' : 'Vista 3D'}</Button><Button disabled={!!mode} aria-pressed={!locked} onClick={toggleLock}>{locked ? 'Permitir giro' : 'Fijar norte'}</Button></div>
      <label className="source-title">Terreno con elevación<Switch checked={terrain} disabled={!!mode} aria-label="Activar relieve" onChange={value=>{setTerrain(value);map.current?.easeTo({pitch:value?55:0,duration:450});}}/></label><label>Exageración vertical {exaggeration.toFixed(1)}×<Slider ariaLabelForHandle="Exageración del relieve" min={0} max={3} step={0.1} value={exaggeration} onChange={setExaggeration}/></label>
      <label>Fuente de alturas<Select aria-label="Fuente de alturas" value={terrainProvider} options={[{value:'Mapterhorn',label:'Mapterhorn · mayor detalle regional'},{value:'AWS',label:'AWS Terrain Tiles · alternativa'}]} onChange={value=>{setTerrainProvider(value);setMapError('');}}/></label>
      <label className="source-title">Edificios 3D<Switch checked={buildings} disabled={!!mode||offsetSupported!==true} aria-label="Edificios 3D" onChange={value=>{setBuildings(value);if(value){setTerrain(true);map.current?.easeTo({pitch:55,duration:450});}setMapError('');}}/></label>
      <p className="muted">{terrainProvider==='Mapterhorn'?'Mapterhorn combina relieve global y datos regionales más detallados; si falta detalle se utiliza el nivel disponible.':'AWS ofrece relieve global alternativo.'} 0× lo aplana. Edificios visibles al acercarse a una ciudad, con alturas orientativas de OpenStreetMap. Las capas se apoyan en el terreno. La selección y el análisis se hacen en 2D.</p>
      {terrain&&offsetSupported===false&&<p role="status" className="muted">Tu GPU no permite apoyar volúmenes en el relieve. Edificios 3D desactivados en esta vista.</p>}
    </div></details>
    {mode&&<>{mode==='rectangle'&&<div className="selection-surface" aria-label="Superficie de selección del mapa" onPointerDown={e=>{if(!map.current||!e.isPrimary)return;e.currentTarget.setPointerCapture(e.pointerId);down.current={x:e.clientX,y:e.clientY,geo:geographic(e.clientX,e.clientY)};}} onPointerMove={e=>{if(mode!=='rectangle'||!map.current)return;const start=corner??down.current?.geo;if(start)setPreview(boundsOf(start,geographic(e.clientX,e.clientY)));}} onPointerUp={e=>{if(!e.isPrimary)return;const start=down.current;down.current=null;if(!start||!map.current)return;const end=geographic(e.clientX,e.clientY);if(mode!=='rectangle'){latest.current.onPoint(end);return;}if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)complete(boundsOf(corner??start.geo,end));else if(corner)complete(boundsOf(corner,end));else setCorner(end);}} onPointerCancel={()=>{down.current=null;setPreview(null);}}/>}
      <div className="interaction-banner" role="status"><span>{mode==='rectangle'?(corner?'Ahora marca la esquina opuesta.':'Arrastra un rectángulo o toca dos esquinas.'):mode==='polygon'?`${vertices.length} vértices · Marca puntos; toca el primero o pulsa Cerrar y analizar. Sin resultados hasta cerrar.`:`Toca el mapa para fijar ${mode==='reach-origin'?'el origen de la isócrona':mode==='origin'?'el origen A':'el destino B'}.`}</span><div className="interaction-actions">{mode==='polygon'&&<><Button disabled={!vertices.length} onClick={()=>{setVertices(points=>points.slice(0,-1));setMapError('');}}>Deshacer punto</Button><Button type="primary" disabled={vertices.length<3} onClick={closePolygon}>Cerrar y analizar</Button></>}<Button onClick={props.onCancel}>Cancelar</Button></div></div></>}
    {mapError && <div className="map-error" role="alert">{mapError}<button aria-label="Cerrar aviso del mapa" onClick={()=>setMapError('')}>×</button></div>}
    <div className="raster-attributions">{terrain&&<><span>Relieve © {terrainProvider==='Mapterhorn'?<a href="https://mapterhorn.com/attribution/" target="_blank" rel="noreferrer">Mapterhorn y sus fuentes</a>:<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noreferrer">Terrain Tiles / AWS</a>}</span>{effectiveBase==='Satélite'?<span>© <a href="https://versatiles.org/sources/" target="_blank" rel="noreferrer">VersaTiles</a> · Sentinel-2 / DGT</span>:effectiveBase!=='Sin fondo'&&<span>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></span>}</>}{buildings&&(terrain||tilted)&&<span>Edificios © <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank" rel="noreferrer">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></span>}{displayedRasters.map(r=><span key={r.id}>{r.attribution}</span>)}</div>
    {children}
  </main>;
});



