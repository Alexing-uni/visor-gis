export type StorageMode = 'browser' | 'server';
// Selección explícita durante la compilación; nunca ocultar una API caída con un fallback.
export const storageMode: StorageMode = import.meta.env.VITE_STORAGE_MODE === 'browser' ? 'browser' : 'server';
export const staticUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
