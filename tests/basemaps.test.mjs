import test from 'node:test';
import assert from 'node:assert/strict';
import { backgroundFor, styles, satelliteTiles, satelliteProtocolTiles } from '../src/lib/basemaps.ts';

test('PNOA mantiene imágenes fuera de España al cambiar desde cualquier tema', () => {
  for (const theme of ['Oscuro','Claro','Cartográfico','Sin fondo']) {
    assert.equal(backgroundFor(theme,{id:'pnoa'}),'Satélite');
  }
  assert.equal(backgroundFor('Oscuro'),'Oscuro');
  assert.equal(backgroundFor('Claro',{id:'regional-custom'}),'Claro');
});
test('El fondo satélite utiliza imágenes globales y publica su atribución', () => {
  assert.deepEqual(styles.Satélite.sources.satellite.tiles,[satelliteProtocolTiles]);
  assert.match(satelliteTiles,/^https:\/\/tiles.versatiles.org\/tiles\/satellite\//);
  assert.equal(styles.Satélite.sources.satellite.tileSize,512);
  assert.match(styles.Satélite.sources.satellite.attribution,/versatiles.org\/sources/);
  assert.equal(styles.Satélite.layers.some(layer=>layer.type==='raster'),true);
  assert.match(styles.Cartográfico,/\/styles\/liberty$/);
});
