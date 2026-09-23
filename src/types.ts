export type Kind = 'point' | 'line' | 'polygon';
export type Layer = {
  id: string; name: string; kind: Kind; crs: string; visible: boolean;
  stroke: string; fill: string; width: number; opacity: number; sort_order: number;
};
export type Geometry = {type: string; coordinates: unknown};
export type Feature = {type: 'Feature'; geometry: Geometry; properties: Record<string, unknown>};
export type Collection = {type: 'FeatureCollection'; features: Feature[]};
export type Pick = {layerId: string; properties: Record<string, unknown>; x: number; y: number};
