import { DatabaseSync } from 'node:sqlite';

export function openDatabase(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`CREATE TABLE IF NOT EXISTS layers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL,
    source TEXT NOT NULL, crs TEXT NOT NULL, visible INTEGER NOT NULL DEFAULT 1,
    stroke TEXT NOT NULL, fill TEXT NOT NULL, width REAL NOT NULL,
    opacity REAL NOT NULL, sort_order INTEGER NOT NULL, radius REAL NOT NULL DEFAULT 4
  )`);
  // Migración de la primera versión: conserva los estilos guardados y añade radio independiente.
  const columns = db.prepare('PRAGMA table_info(layers)').all().map(column => column.name);
  if (!columns.includes('radius')) db.exec('ALTER TABLE layers ADD COLUMN radius REAL NOT NULL DEFAULT 4');
  const defaults = [
    ['points', 'Puntos · Chile', 'point', 'points.geojson', 'EPSG:31994', 1, '#b94709', '#fb923c', 1, 0.9, 2, 4],
    ['lines', 'Viales · Asturias', 'line', 'lines.geojson', 'EPSG:4258', 1, '#087f9a', '#087f9a', 2, 0.9, 1, 4],
    ['polygons', 'Geología · Chile', 'polygon', 'polygons.geojson', 'EPSG:4326', 1, '#7c3aed', '#a78bfa', 1, 0.45, 0, 4],
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO layers (id,name,kind,source,crs,visible,stroke,fill,width,opacity,sort_order,radius) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const row of defaults) insert.run(...row);
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version < 2) {
    const rename = db.prepare('UPDATE layers SET name=? WHERE id=? AND name=?');
    rename.run('Puntos · Chile', 'points', 'Puntos de muestra');
    rename.run('Viales · Asturias', 'lines', 'Recorridos');
    rename.run('Geología · Chile', 'polygons', 'Áreas de estudio');
    db.exec('PRAGMA user_version=2');
  }
  return db;
}
export function listLayers(db) {
  return db.prepare('SELECT * FROM layers ORDER BY sort_order ASC').all().map(layer => ({ ...layer, visible: Boolean(layer.visible) }));
}
