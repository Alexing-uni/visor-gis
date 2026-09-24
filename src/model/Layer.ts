import type { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Bounds, Collection, LayerConfig, Properties, VectorFeature } from '../types.ts';
export type RGBArray = [number, number, number];
export type ColorConfig = {
  fillColor: RGBArray;
  borderColor: RGBArray;
  borderWidth: number;
  opacity: number;
  visible: boolean;
};
export interface Layer {
  readonly id: string;
  name: string;
  readonly data: Collection;
  bounds: Bounds | null;
  setName(name: string): void;
  setBounds(bounds: Bounds | null): void;
  setColor(color: ColorConfig): void;
  getColor(): ColorConfig;
  toDeckLayer(onFeatureClick: (info: PickingInfo<VectorFeature>, id: string) => void): GeoJsonLayer<Properties>;
  attributes(feature: VectorFeature): Array<{ label: string; value: string }>;
  readonly config: LayerConfig;
}
