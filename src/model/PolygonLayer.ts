import { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Properties, VectorFeature } from '../types.ts';
import { BaseLayer } from './BaseLayer.ts';
export class PolygonLayer extends BaseLayer {
  protected readonly fields: Array<[string, string]> = [['OBJECTID', 'ID'], ['CD_GEOL', 'Código geológico'], ['classifica', 'Clasificación'], ['EDAD', 'Edad'], ['TIPO', 'Tipo'], ['ROCA1', 'Roca'], ['TOTPOP_CY', 'Población (dato original)'], ['Riesgo', 'Riesgo (dato original)']];
  toDeckLayer(onFeatureClick: (info: PickingInfo<VectorFeature>, id: string) => void) {
    return new GeoJsonLayer<Properties>({ ...this.common(onFeatureClick), filled: true, extruded: false });
  }
}
