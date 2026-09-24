import { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Properties, VectorFeature } from '../types.ts';
import { BaseLayer } from './BaseLayer.ts';
export class PointLayer extends BaseLayer {
  protected readonly fields: Array<[string, string]> = [['id', 'ID'], ['Pend_1', 'Pendiente (valor original)'], ['Orient_1', 'Orientación (valor original)'], ['row_index', 'Fila'], ['col_index', 'Columna']];
  toDeckLayer(onFeatureClick: (info: PickingInfo<VectorFeature>, id: string) => void) {
    return new GeoJsonLayer<Properties>({ ...this.common(onFeatureClick), filled: true, pointType: 'circle', pointRadiusUnits: 'pixels', getPointRadius: this.config.radius });
  }
}
