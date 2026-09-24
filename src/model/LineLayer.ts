import { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Properties, VectorFeature } from '../types.ts';
import { BaseLayer } from './BaseLayer.ts';
export class LineLayer extends BaseLayer {
  protected readonly fields: Array<[string, string]> = [['id_tramo', 'Tramo'], ['nombre', 'Nombre'], ['tipo_viald', 'Tipo de vía'], ['calzadad', 'Calzada'], ['firmed', 'Firme'], ['ncarriles', 'Carriles'], ['sentidod', 'Sentido'], ['estadofisd', 'Estado'], ['fuente_td', 'Fuente']];
  toDeckLayer(onFeatureClick: (info: PickingInfo<VectorFeature>, id: string) => void) {
    return new GeoJsonLayer<Properties>({ ...this.common(onFeatureClick), filled: false });
  }
}
