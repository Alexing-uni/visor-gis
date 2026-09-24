import type { Feature, FeatureCollection, Geometry } from 'geojson';

export type Kind = 'point' | 'line' | 'polygon';
export type VectorGeometry = Exclude<Geometry, { type: 'GeometryCollection' }>;
export type Properties = Record<string, unknown> | null;
export type VectorFeature = Feature<VectorGeometry, Properties>;
export type Collection = FeatureCollection<VectorGeometry, Properties>;
export type Bounds = [number, number, number, number];
export type LayerConfig = {
  id: string;
  name: string;
  kind: Kind;
  source: string;
  crs: string;
  visible: boolean;
  stroke: string;
  fill: string;
  width: number;
  opacity: number;
  radius: number;
  sort_order: number;
};
export type LayerPatch = Partial<Pick<LayerConfig, 'name' | 'visible' | 'stroke' | 'fill' | 'width' | 'opacity' | 'radius'>>;
export type Selection = { layerId: string; feature: VectorFeature; x: number; y: number };
export type Place = { id: string; label: string; center: [number, number]; bounds?: Bounds; source: 'local' };
