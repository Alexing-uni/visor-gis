import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { listLayers } from './database.js';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fold = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function createApp({ db, dataDirectory, staticDirectory, places }) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/layers', (_req, res) => res.json(listLayers(db)));
  app.get('/api/layers/:id/data', async (req, res) => {
    const layer = db.prepare('SELECT source FROM layers WHERE id=?').get(req.params.id);
    if (!layer) return res.status(404).json({ error: 'Capa no encontrada' });
    const filename = path.resolve(dataDirectory, layer.source);
    if (!filename.startsWith(path.resolve(dataDirectory) + path.sep)) return res.status(400).json({ error: 'Ruta de datos inválida' });
    try { res.json(JSON.parse(await readFile(filename, 'utf8'))); }
    catch { res.status(500).json({ error: `No se pudo leer ${layer.source}. Comprueba el archivo GeoJSON.` }); }
  });
  app.patch('/api/layers/:id', (req, res) => {
    if (!db.prepare('SELECT id FROM layers WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Capa no encontrada' });
    if (!object(req.body)) return res.status(400).json({ error: 'El cuerpo debe ser un objeto JSON' });
    const patch = { ...req.body };
    const changes = Object.entries(patch);
    const allowed = ['name', 'visible', 'stroke', 'fill', 'width', 'opacity', 'radius'];
    if (!changes.length || changes.some(([key]) => !allowed.includes(key))) return res.status(400).json({ error: 'Campos no permitidos o petición vacía' });
    for (const [key, value] of changes) {
      if (key === 'name' && (typeof value !== 'string' || !value.trim() || value.length > 100)) return res.status(400).json({ error: 'El nombre debe tener entre 1 y 100 caracteres' });
      if (['stroke', 'fill'].includes(key) && (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value))) return res.status(400).json({ error: 'Color inválido' });
      if (key === 'visible' && typeof value !== 'boolean') return res.status(400).json({ error: 'Visibilidad inválida' });
      if (['width', 'radius', 'opacity'].includes(key)) {
        const minimum = key === 'opacity' ? 0 : key === 'width' ? 0.5 : 1;
        const maximum = key === 'opacity' ? 1 : 20;
        if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) return res.status(400).json({ error: `${key}: valor fuera de rango` });
      }
    }
    if (patch.name) patch.name = patch.name.trim();
    db.prepare(`UPDATE layers SET ${changes.map(([key]) => `${key}=?`).join(',')} WHERE id=?`).run(...changes.map(([key]) => key === 'visible' ? Number(patch[key]) : patch[key]), req.params.id);
    res.json(listLayers(db).find(layer => layer.id === req.params.id));
  });
  app.put('/api/layers/order', (req, res) => {
    const ids = req.body?.ids;
    const current = listLayers(db).map(layer => layer.id);
    if (!Array.isArray(ids) || ids.length !== current.length || new Set(ids).size !== ids.length || !ids.every(id => current.includes(id))) return res.status(400).json({ error: 'El orden debe contener todas las capas una sola vez' });
    db.exec('BEGIN');
    try {
      const update = db.prepare('UPDATE layers SET sort_order=? WHERE id=?');
      ids.forEach((id, index) => update.run(index, id));
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    res.json(listLayers(db));
  });
  // Catálogo local: búsqueda sin transmitir las consultas a un proveedor externo.
  app.get('/api/search', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (query.length < 2) return res.json([]);
    if (query.length > 120) return res.status(400).json({ error: 'Consulta demasiado larga' });
    const words = fold(query).split(/\s+/);
    res.json(places.filter(place => words.every(word => fold(place.label + ' ' + (place.keywords || '')).includes(word))).slice(0, 8).map(({ keywords: _keywords, ...place }) => place));
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta de API no encontrada' }));
  if (staticDirectory) app.use(express.static(staticDirectory));
  app.use((error, _req, res, _next) => {
    const status = error.status === 400 || error.status === 413 ? error.status : 500;
    res.status(status).json({ error: status === 400 ? 'JSON no válido' : status === 413 ? 'Petición demasiado grande' : 'Error interno del servidor' });
  });
  return app;
}
