import { LayerExtension, type Layer } from '@deck.gl/core';

// Tone only the global background tiles, before compositing PNOA/thematic images.
// Regional imagery therefore keeps its original colours and transparent coverage.
export class BasemapToneExtension extends LayerExtension<{ dark: boolean }> {
  static extensionName = 'BasemapToneExtension';
  getShaders(this: Layer, extension: BasemapToneExtension) {
    return { inject: { 'fs:DECKGL_FILTER_COLOR': { order: -10, injection: `
      float grey = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb = vec3(${extension.opts.dark ? '0.10 + (1.0 - grey) * 0.35' : '0.15 + grey * 0.85'});
    ` } } };
  }
}
