import type { Collection, LayerConfig } from '../types.ts';
import type { Layer } from './Layer.ts';
import { PointLayer } from './PointLayer.ts';
import { LineLayer } from './LineLayer.ts';
import { PolygonLayer } from './PolygonLayer.ts';
export function createLayer(config: LayerConfig, data: Collection): Layer {
  switch (config.kind) {
    case 'point': return new PointLayer(config, data);
    case 'line': return new LineLayer(config, data);
    case 'polygon': return new PolygonLayer(config, data);
  }
}
