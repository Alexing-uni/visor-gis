import test from 'node:test';
import assert from 'node:assert/strict';
import { buildingDimensions, prepareBuildings } from '../src/lib/buildings.ts';

const polygon = (properties = {}) => ({type:'Feature',properties,geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}});
test('Edificios: altura superior y mínima definen la extrusión sin cambiar la altura total', () => {
  const source=polygon({render_height:'24',render_min_height:4}),snapshot=JSON.stringify(source);
  assert.deepEqual(buildingDimensions(source),{base:4,extrusion:20});
  const prepared=prepareBuildings([source]);
  assert.deepEqual(prepared[0].geometry.coordinates[0][0],[0,0,4]);
  assert.equal(buildingDimensions(prepared[0]).extrusion+prepared[0].geometry.coordinates[0][0][2],24);
  assert.equal(JSON.stringify(source),snapshot);
});
test('Edificios: omite alturas ausentes, ocultos y geometrías que no permiten volumen', () => {
  for(const properties of [{},{render_height:null},{render_height:''},{render_height:Infinity},{render_height:-1},{render_height:20,render_min_height:30},{render_height:20,render_min_height:-1},{render_height:20,hide_3d:'true'},{render_height:20,hide_3d:1}]) {
    assert.equal(buildingDimensions(polygon(properties)),null);
  }
  assert.equal(buildingDimensions({...polygon({render_height:20}),geometry:{type:'LineString',coordinates:[[0,0],[1,1]]}}),null);
  assert.equal(prepareBuildings([polygon(),polygon({render_height:8})]).length,1);
});
test('Edificios: MultiPolygon conserva anillos, huecos y partes al elevarlos', () => {
  const outer=[[0,0],[4,0],[4,4],[0,0]],hole=[[1,1],[2,1],[2,2],[1,1]],second=[[5,5],[6,5],[6,6],[5,5]];
  const feature={...polygon({render_height:15,render_min_height:3}),geometry:{type:'MultiPolygon',coordinates:[[outer,hole],[second]]}};
  const result=prepareBuildings([feature])[0];
  assert.equal(result.geometry.coordinates.length,2);
  assert.equal(result.geometry.coordinates[0].length,2);
  assert.deepEqual(result.geometry.coordinates[0][1][2],[2,2,3]);
  assert.deepEqual(result.geometry.coordinates[1][0][2],[6,6,3]);
});
