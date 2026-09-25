import type { Bounds } from '../types.ts';

export type RasterSource = {
  id: string; name: string; type: 'wms' | 'wmts'; url: string; layers?: string;
  attribution: string; visible: boolean; opacity: number; bounds?: Bounds;
};
export const officialSources: RasterSource[] = [
  { id: 'pnoa', name: 'Ortofoto PNOA', type: 'wms', url: 'https://www.ign.es/wms-inspire/pnoa-ma', layers: 'OI.OrthoimageCoverage', attribution: 'PNOA cedido por © Instituto Geográfico Nacional de España', visible: false, opacity: 1, bounds: [-9.5, 36, 3.4, 43.9] },
  { id: 'hydro', name: 'Ríos y red hidrográfica', type: 'wms', url: 'https://servicios.idee.es/wms-inspire/hidrografia', layers: 'HY.Network', attribution: '© IGN · Sistema Cartográfico Nacional · IGR Hidrografía', visible: false, opacity: 0.85, bounds: [-9.5, 36, 3.4, 43.9] },
];
export function validateRaster(input: RasterSource): RasterSource {
  const parsed = new URL(input.url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('El servicio debe usar HTTPS sin credenciales en la URL.');
  if (!input.name.trim() || !input.attribution.trim()) throw new Error('Indica nombre y atribución del servicio.');
  if (input.type === 'wms' && !input.layers?.trim()) throw new Error('Indica el nombre técnico de la capa WMS (GetCapabilities).');
  if (input.type === 'wmts' && !['{z}', '{x}', '{y}'].every(token => input.url.includes(token))) throw new Error('WMTS necesita una plantilla EPSG:3857 compatible XYZ con {z}, {x} y {y}. Una URL GetCapabilities no es una plantilla.');
  return input;
}
export function tileUrl(source: RasterSource, tile: {x:number;y:number;z:number}, bounds: Bounds): string {
  if (source.type === 'wmts') return source.url.replaceAll('{z}', String(tile.z)).replaceAll('{x}', String(tile.x)).replaceAll('{y}', String(tile.y));
  const url = new URL(source.url);
  // Remove request-specific parameters case insensitively from pasted capabilities URLs.
  const replace = ['service','request','version','layers','styles','format','transparent','srs','crs','bbox','width','height'];
  [...url.searchParams.keys()].filter(key => replace.includes(key.toLowerCase())).forEach(key => url.searchParams.delete(key));
  const mercator = (lon:number,lat:number) => [6378137*lon*Math.PI/180,6378137*Math.log(Math.tan(Math.PI/4+Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/360))];
  const a=mercator(bounds[0],bounds[1]), b=mercator(bounds[2],bounds[3]);
  Object.entries({ SERVICE:'WMS', REQUEST:'GetMap', VERSION:'1.1.1', LAYERS:source.layers!, STYLES:'', FORMAT:'image/png', TRANSPARENT:'TRUE', SRS:'EPSG:3857', BBOX:[...a,...b].join(','), WIDTH:'256', HEIGHT:'256' }).forEach(([key,value])=>url.searchParams.set(key,value));
  return url.toString();
}
