import type { StyleSpecification } from 'maplibre-gl';
import type { RasterSource } from './raster.ts';
import { satelliteProtocolTiles } from './satelliteSource.ts';

export const emptyStyle: StyleSpecification = {
  version: 8, sources: {}, layers: [{id:'background',type:'background',paint:{'background-color':'#e8eff4'}}],
};
export { satelliteTiles, satelliteProtocolTiles } from './satelliteSource.ts';
export const satelliteAttribution = '© <a href="https://versatiles.org/sources/">VersaTiles</a> · Sentinel-2 / DGT';
export const styles: Record<string, string | StyleSpecification> = {
  Claro: 'https://tiles.openfreemap.org/styles/positron',
  Oscuro: 'https://tiles.openfreemap.org/styles/dark',
  Cartográfico: 'https://tiles.openfreemap.org/styles/liberty',
  Satélite: {
    version:8,
    sources:{satellite:{type:'raster',tiles:[satelliteProtocolTiles],tileSize:512,minzoom:0,maxzoom:19,attribution:satelliteAttribution}},
    layers:[...emptyStyle.layers,{id:'satellite',type:'raster',source:'satellite',paint:{'raster-opacity':1}}],
  },
  'Sin fondo': emptyStyle,
};

// Regional PNOA has its own global imagery fallback; it must never inherit a
// previously selected dark theme. Other registered bases keep their fallback.
export function backgroundFor(base: string, regionalBase?: Pick<RasterSource,'id'>): string {
  return regionalBase?.id === 'pnoa' ? 'Satélite' : base;
}
