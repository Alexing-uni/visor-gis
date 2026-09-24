import bbox from '@turf/bbox';
import type { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Bounds, Collection, LayerConfig, Properties, VectorFeature } from '../types.ts';
import type { ColorConfig, Layer, RGBArray } from './Layer.ts';
const rgb = (value: string): RGBArray => [1, 3, 5].map(start => parseInt(value.slice(start, start + 2), 16)) as RGBArray;
export abstract class BaseLayer implements Layer {
  readonly id: string;
  name: string;
  readonly data: Collection;
  readonly config: LayerConfig;
  bounds: Bounds | null;
  protected color: ColorConfig;
  protected abstract readonly fields: Array<[string, string]>;
  constructor(config: LayerConfig, data: Collection) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.data = data;
    const calculated = data.features.length ? bbox(data) : null;
    this.bounds = calculated?.every(Number.isFinite) ? calculated as Bounds : null;
    this.color = { fillColor: rgb(config.fill), borderColor: rgb(config.stroke), borderWidth: config.width, opacity: config.opacity, visible: config.visible };
  }
  setName(name: string) { this.name = name; }
  setBounds(bounds: Bounds | null) { this.bounds = bounds; }
  setColor(color: ColorConfig) { this.color = { ...color }; }
  getColor() { return { ...this.color }; }
  attributes(feature: VectorFeature) {
    const properties = feature.properties ?? {};
    return this.fields.flatMap(([key, label]) => {
      const value = properties[key];
      return value === null || value === undefined || value === '' || typeof value === 'object' ? [] : [{ label, value: String(value) }];
    });
  }
  protected common(onFeatureClick: (info: PickingInfo<VectorFeature>, id: string) => void) {
    return {
      id: this.id, data: this.data, visible: this.color.visible, pickable: this.color.visible && this.color.opacity > 0,
      opacity: this.color.opacity, getFillColor: this.color.fillColor, getLineColor: this.color.borderColor,
      getLineWidth: this.color.borderWidth, lineWidthUnits: 'pixels' as const,
      stroked: true, parameters: { depthCompare: 'always' as const, depthWriteEnabled: false },
      onClick: (info: PickingInfo<VectorFeature>) => onFeatureClick(info, this.id),
    };
  }
  abstract toDeckLayer(onFeatureClick: (info: PickingInfo<VectorFeature>, id: string) => void): GeoJsonLayer<Properties>;
}
