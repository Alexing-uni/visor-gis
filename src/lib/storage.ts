import type { LayerConfig } from '../types.ts';
import type { ImportedLayer } from './import.ts';

export type SavedLayers = { configs: LayerConfig[] | null; imports: ImportedLayer[] };
export type LayerStorage = {
  load(): Promise<SavedLayers>;
  saveConfigs(configs: LayerConfig[]): Promise<void>;
  add(items: ImportedLayer[], configs: LayerConfig[]): Promise<void>;
  remove(id: string, configs: LayerConfig[]): Promise<void>;
};
const persistenceError = (error: unknown) => new Error(`No se pudo guardar en este navegador: ${error instanceof Error ? error.message : String(error)}. Comprueba el espacio disponible y los permisos de almacenamiento. El cambio no se ha aplicado.`);

// Transacciones atómicas: el hook solo cambia el estado visible después de oncomplete.
// Inyectar IDBFactory permite comprobar persistencia real con fake-indexeddb en Node.
export function createLayerStorage(mode: string, factory: IDBFactory | undefined = globalThis.indexedDB, dbName = 'visor-gis-v04'): LayerStorage {
  let opening: Promise<IDBDatabase> | undefined;
  const open = () => {
    if (!opening) opening = new Promise<IDBDatabase>((resolve, reject) => {
      if (!factory) { reject(new Error('IndexedDB no está disponible.')); return; }
      const request = factory.open(dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('configs');
        db.createObjectStore('imports', { keyPath: 'config.id' });
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Cierra las otras pestañas del visor para actualizar su almacenamiento.'));
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); opening = undefined; };
        resolve(request.result);
      };
    }).catch(error => { opening = undefined; throw error; });
    return opening;
  };
  const write = async (configs: LayerConfig[], operation?: (store: IDBObjectStore) => void) => {
    try {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(['configs', 'imports'], 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Transacción cancelada.'));
        try {
          transaction.objectStore('configs').put(configs, mode);
          if (operation) operation(transaction.objectStore('imports'));
        } catch (error) { transaction.abort(); reject(error); }
      });
    } catch (error) { throw persistenceError(error); }
  };
  return {
    async load() {
      const db = await open();
      return new Promise<SavedLayers>((resolve, reject) => {
        const transaction = db.transaction(['configs', 'imports'], 'readonly');
        const configs = transaction.objectStore('configs').get(mode);
        const imports = transaction.objectStore('imports').getAll();
        transaction.oncomplete = () => resolve({ configs: configs.result ?? null, imports: imports.result });
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    },
    saveConfigs: configs => write(configs),
    add: (items, configs) => write(configs, store => items.forEach(item => store.add(item))),
    remove: (id, configs) => write(configs, store => store.delete(id)),
  };
}

export function mergeLayerConfigs(originals: LayerConfig[], saved: SavedLayers, mode: 'browser' | 'server'): LayerConfig[] {
  const preferences = new Map((saved.configs || []).map(config => [config.id, config]));
  const all = [...originals, ...saved.imports.map(item => item.config)];
  const merged = all.map((config, index) => {
    const previous = preferences.get(config.id);
    const editable = mode === 'browser' || config.source === 'browser:import';
    const style = previous && editable ? { name: previous.name, visible: previous.visible, stroke: previous.stroke, fill: previous.fill, width: previous.width, opacity: previous.opacity, radius: previous.radius } : {};
    // Nunca restaurar source, CRS o kind antiguos sobre un catálogo actualizado.
    return { ...config, ...style, sort_order: previous?.sort_order ?? index };
  }).sort((a, b) => a.sort_order - b.sort_order);
  let originalIndex = 0;
  return merged.map((config, sort_order) => ({
    ...(mode === 'server' && config.source !== 'browser:import' ? originals[originalIndex++] : config), sort_order,
  }));
}
