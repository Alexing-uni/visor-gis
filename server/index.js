import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new DatabaseSync(path.join(root, 'server', 'visor.sqlite'));
db.exec(`CREATE TABLE IF NOT EXISTS layers (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, source TEXT NOT NULL, crs TEXT NOT NULL, visible INTEGER NOT NULL DEFAULT 1, stroke TEXT NOT NULL, fill TEXT NOT NULL, width REAL NOT NULL, opacity REAL NOT NULL, sort_order INTEGER NOT NULL);`);
const defaults = [
  ['points','Puntos de muestra','point','points.geojson','EPSG:31994',1,'#f97316','#f97316',8,0.95,2],
  ['lines','Recorridos','line','lines.geojson','EPSG:4258',1,'#06b6d4','#06b6d4',4,0.9,1],
  ['polygons','Áreas de estudio','polygon','polygons.geojson','EPSG:4326',1,'#a855f7','#a855f7',3,0.32,0]
];
const insert=db.prepare('INSERT OR IGNORE INTO layers VALUES (?,?,?,?,?,?,?,?,?,?,?)');
for(const row of defaults) insert.run(...row);
const app=express(); app.use(express.json({limit:'1mb'}));
const all=()=>db.prepare('SELECT * FROM layers ORDER BY sort_order ASC').all().map(x=>({...x,visible:Boolean(x.visible)}));
app.get('/api/layers',(_req,res)=>res.json(all()));
app.get('/api/layers/:id/data',async(req,res)=>{
 const layer=db.prepare('SELECT source FROM layers WHERE id=?').get(req.params.id);
 if(!layer) return res.status(404).json({error:'Capa no encontrada'});
 try {const data=JSON.parse(await readFile(path.join(root,'public','data',layer.source),'utf8'));res.json(data)}
 catch {res.status(500).json({error:'No se pudo leer el GeoJSON'})}
});
app.patch('/api/layers/:id',(req,res)=>{
 const allowed=['name','visible','stroke','fill','width','opacity'];
 const changes=Object.entries(req.body).filter(([key])=>allowed.includes(key));
 if(!db.prepare('SELECT id FROM layers WHERE id=?').get(req.params.id)) return res.status(404).json({error:'Capa no encontrada'});
 if(!changes.length) return res.status(400).json({error:'Sin cambios válidos'});
 for(const [key,value] of changes){
  if(key==='name' && (typeof value!=='string'||!value.trim()||value.length>100)) return res.status(400).json({error:'Nombre inválido'});
  if(['stroke','fill'].includes(key) && (typeof value!=='string'||!/^#[0-9a-fA-F]{6}$/.test(value))) return res.status(400).json({error:'Color inválido'});
  if(key==='width' && (typeof value!=='number'||value<1||value>20)) return res.status(400).json({error:'Grosor inválido'});
  if(key==='opacity' && (typeof value!=='number'||value<0||value>1)) return res.status(400).json({error:'Opacidad inválida'});
  if(key==='visible' && typeof value!=='boolean') return res.status(400).json({error:'Visibilidad inválida'});
 }
 const stmt=db.prepare(`UPDATE layers SET ${changes.map(([key])=>`${key}=?`).join(',')} WHERE id=?`);
 stmt.run(...changes.map(([key,value])=>key==='visible'?Number(value):value),req.params.id);
 res.json(all().find(x=>x.id===req.params.id));
});
app.put('/api/layers/order',(req,res)=>{
 const ids=req.body.ids;
 const current=all().map(x=>x.id);
 if(!Array.isArray(ids)||ids.length!==current.length||new Set(ids).size!==ids.length||!ids.every(id=>current.includes(id))) return res.status(400).json({error:'Orden inválido'});
 db.exec('BEGIN');try{const stmt=db.prepare('UPDATE layers SET sort_order=? WHERE id=?');ids.forEach((id,i)=>stmt.run(i,id));db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}
 res.json(all());
});
app.use(express.static(path.join(root,'dist')));
app.listen(3001,()=>console.log('API lista en http://localhost:3001'));
