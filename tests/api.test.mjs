import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase, listLayers } from '../server/database.js';
import { createApp } from '../server/app.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const places=JSON.parse(readFileSync(new URL('../server/places.json',import.meta.url),'utf8'));

test('API: datasets independientes, cambios persistentes, rechazos de entrada y búsqueda local', async () => {
  const directory=mkdtempSync(path.join(tmpdir(),'visor-gis-test-'));
  const filename=path.join(directory,'test.sqlite');
  const db=openDatabase(filename);
  const app=createApp({db,dataDirectory:path.join(root,'public','data'),places});
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=(route,method='GET',data)=>fetch(base+route,{method,headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  try {
    assert.equal((await(await request('/api/layers')).json()).length,3);
    for(const id of ['points','lines','polygons']) assert.equal((await request(`/api/layers/${id}/data`)).status,200);
    assert.equal((await request('/api/layers/missing/data')).status,404);
    assert.equal((await request('/api/layers/points','PATCH',{name:'Mi capa',opacity:0.55,radius:6})).status,200);
    assert.equal((await request('/api/layers/points','PATCH',{stroke:'bad'})).status,400);
    assert.equal((await request('/api/layers/points','PATCH',[])).status,400);
    assert.equal((await request('/api/layers/points','PATCH',{source:'other'})).status,400);
    assert.equal((await request('/api/layers/order','PUT',{ids:['points','points','lines']})).status,400);
    assert.equal((await request('/api/layers/order','PUT',{ids:['lines','points','polygons']})).status,200);
    const results=await(await request('/api/search?q=Asturias')).json();
    assert.ok(results.some(x=>x.bounds));assert.ok(results.some(x=>!x.bounds));
    assert.deepEqual(await(await request('/api/search?q=sin-coincidencia')).json(),[]);
  } finally {await new Promise(resolve=>server.close(resolve));db.close();}
  const reopened=openDatabase(filename);
  try {const rows=listLayers(reopened);assert.deepEqual(rows.map(x=>x.id),['lines','points','polygons']);assert.equal(rows[1].name,'Mi capa');assert.equal(rows[1].opacity,0.55);assert.equal(rows[1].radius,6);} finally {reopened.close();}
});
test('Migración de base anterior conserva preferencias existentes', () => {
  const filename=path.join(mkdtempSync(path.join(tmpdir(),'visor-gis-migration-')),'old.sqlite');
  const old=new DatabaseSync(filename);
  old.exec("CREATE TABLE layers(id TEXT PRIMARY KEY,name TEXT,kind TEXT,source TEXT,crs TEXT,visible INTEGER,stroke TEXT,fill TEXT,width REAL,opacity REAL,sort_order INTEGER)");
  old.prepare('INSERT INTO layers VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('points','Nombre personalizado','point','points.geojson','EPSG:31994',0,'#112233','#334455',3,0.4,2);old.close();
  const migrated=openDatabase(filename);
  try {const row=listLayers(migrated).find(x=>x.id==='points');assert.equal(row.name,'Nombre personalizado');assert.equal(row.visible,false);assert.equal(row.width,3);assert.equal(row.opacity,0.4);assert.equal(row.radius,4);} finally {migrated.close();}
});
