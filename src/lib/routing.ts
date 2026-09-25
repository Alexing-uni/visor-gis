import type { LineString } from 'geojson';

export type RouteEndpoint = { label: string; coordinates: [number, number] };
export type RouteEndpointKind = 'origin' | 'destination';
export type RouteStep = { instruction: string; distance: number; duration: number; location: [number, number] };
export type RouteWaypoint = { location: [number, number]; distance: number; name: string };
export type RouteResult = {
  geometry: LineString;
  distance: number;
  duration: number;
  steps: RouteStep[];
  waypoints: RouteWaypoint[];
  provider: 'OSRM';
  profile: 'driving';
};

// Public demonstration services: see docs/RUTAS.md before a deployment with many users.
export const ROUTING_SERVICES = {
  geocoderUrl: 'https://photon.komoot.io/api/',
  routingUrl: 'https://router.project-osrm.org/route/v1/driving/',
};
export const MAX_SNAP_DISTANCE_METRES = 1000;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function validCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number'
    && Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}

function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres).toLocaleString('es-ES')} m`
    : `${(metres / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export function instructionForStep(value: unknown): string {
  const step = record(value), maneuver = record(step.maneuver);
  const directions: Record<string, string> = {
    right: 'a la derecha', left: 'a la izquierda', 'slight right': 'ligeramente a la derecha',
    'slight left': 'ligeramente a la izquierda', 'sharp right': 'cerrado a la derecha',
    'sharp left': 'cerrado a la izquierda', straight: 'recto', uturn: 'cambiando de sentido',
  };
  const direction = directions[String(maneuver.modifier)] || '';
  const road = typeof step.name === 'string' && step.name ? ` por ${step.name}` : '';
  const exit = typeof maneuver.exit === 'number' && maneuver.exit > 0 ? ` y toma la salida ${maneuver.exit}` : '';
  switch (maneuver.type) {
    case 'depart': return `Inicia el recorrido${road}`;
    case 'arrive': return 'Has llegado al destino accesible por carretera';
    case 'turn': return maneuver.modifier === 'uturn' ? `Cambia de sentido${road}` : `Gira ${direction || 'en el cruce'}${road}`;
    case 'roundabout': case 'rotary': return `Entra en la rotonda${exit}${road}`;
    case 'roundabout turn': return `En la rotonda, continúa ${direction}${road}`;
    case 'exit roundabout': case 'exit rotary': return `Sal de la rotonda${road}`;
    case 'merge': return `Incorpórate ${direction}${road}`;
    case 'on ramp': return `Toma el acceso ${direction}${road}`;
    case 'off ramp': return `Toma la salida ${direction}${road}`;
    case 'fork': return `En la bifurcación, continúa ${direction}${road}`;
    case 'end of road': return `Al final de la vía, gira ${direction}${road}`;
    case 'notification': return step.mode === 'ferry' ? `Toma el transbordador${road}` : `Continúa${road}`;
    default: return `Continúa ${direction || 'recto'}${road}`;
  }
}

export function parseRouteResponse(value: unknown): RouteResult {
  const data = record(value);
  if (data.code === 'NoRoute') throw new Error('No existe una ruta por carretera entre esos puntos. Prueba otros accesos.');
  if (data.code === 'NoSegment') throw new Error('Algún punto no tiene acceso a la red de carreteras a menos de 1 km. Selecciona un punto más cercano a una carretera.');
  if (data.code !== 'Ok') throw new Error('El proveedor no ha podido calcular el recorrido. Revisa los puntos e inténtalo de nuevo.');
  const route = record(Array.isArray(data.routes) ? data.routes[0] : null);
  const geometry = record(route.geometry);
  if (geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2
      || !geometry.coordinates.every(validCoordinate) || !nonnegative(route.distance) || !nonnegative(route.duration)) {
    throw new Error('El proveedor devolvió una ruta incompleta o inválida.');
  }
  if (!Array.isArray(data.waypoints) || data.waypoints.length !== 2) throw new Error('Faltan los accesos a la ruta en la respuesta.');
  const waypoints = data.waypoints.map(value => {
    const point = record(value);
    if (!validCoordinate(point.location) || !nonnegative(point.distance)) throw new Error('El proveedor devolvió un acceso inválido.');
    if (point.distance > MAX_SNAP_DISTANCE_METRES) throw new Error('Un acceso está a más de 1 km del punto elegido. Acerca el punto a una carretera.');
    return { location: point.location, distance: point.distance, name: typeof point.name === 'string' ? point.name : '' };
  });
  const steps: RouteStep[] = [];
  if (!Array.isArray(route.legs)) throw new Error('Faltan las indicaciones del recorrido.');
  for (const legValue of route.legs) {
    const leg = record(legValue);
    if (!Array.isArray(leg.steps)) throw new Error('Faltan las indicaciones de un tramo.');
    for (const stepValue of leg.steps) {
      const step = record(stepValue), maneuver = record(step.maneuver);
      if (!nonnegative(step.distance) || !nonnegative(step.duration) || !validCoordinate(maneuver.location)) {
        throw new Error('El proveedor devolvió una indicación inválida.');
      }
      steps.push({ instruction: instructionForStep(step), distance: step.distance, duration: step.duration, location: maneuver.location });
    }
  }
  if (steps.length === 0) throw new Error('El proveedor no devolvió indicaciones para esta ruta.');
  return { geometry: geometry as unknown as LineString, distance: route.distance, duration: route.duration, steps, waypoints, provider: 'OSRM', profile: 'driving' };
}

export function parseSearchResponse(value: unknown): RouteEndpoint[] {
  const data = record(value);
  if (!Array.isArray(data.features)) throw new Error('El buscador devolvió una respuesta inválida.');
  return data.features.flatMap(value => {
    const feature = record(value), geometry = record(feature.geometry), props = record(feature.properties);
    if (geometry.type !== 'Point' || !validCoordinate(geometry.coordinates)) return [];
    const street = [props.street, props.housenumber].filter(x => typeof x === 'string' && x).join(' ');
    const parts = [props.name, street, props.city, props.state, props.country].filter(x => typeof x === 'string' && x) as string[];
    const label = [...new Set(parts)].join(', ') || `${geometry.coordinates[1].toFixed(5)}, ${geometry.coordinates[0].toFixed(5)}`;
    return [{ label, coordinates: [geometry.coordinates[0], geometry.coordinates[1]] as [number, number] }];
  }).slice(0, 5);
}

function abortError() { return new DOMException('Solicitud cancelada', 'AbortError'); }

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, Math.max(0, ms));
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export type RoutingClientOptions = {
  fetcher?: typeof fetch;
  geocoderUrl?: string;
  routingUrl?: string;
  timeoutMs?: number;
  minIntervalMs?: number;
};

export function createRoutingClient(options: RoutingClientOptions = {}) {
  const fetcher = options.fetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const timeoutMs = options.timeoutMs ?? 15000;
  const minIntervalMs = options.minIntervalMs ?? 1100;
  const geocoderUrl = options.geocoderUrl ?? ROUTING_SERVICES.geocoderUrl;
  const routingUrl = options.routingUrl ?? ROUTING_SERVICES.routingUrl;
  const caches = { search: new Map<string, { expires: number; data: RouteEndpoint[] }>(), route: new Map<string, { expires: number; data: RouteResult }>() };
  const queues = { search: Promise.resolve(), route: Promise.resolve() };
  const started = { search: 0, route: 0 };

  async function request(url: URL, kind: 'search' | 'route', signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) throw abortError();
    let release!: () => void;
    const previous = queues[kind];
    queues[kind] = new Promise<void>(resolve => { release = resolve; });
    await previous;
    const controller = new AbortController();
    const abort = () => controller.abort();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      await delay(started[kind] + minIntervalMs - Date.now(), signal);
      if (signal?.aborted) throw abortError();
      started[kind] = Date.now();
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      const response = await fetcher(url.toString(), {
        signal: controller.signal, headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin',
      });
      if (response.status === 429) throw new Error('El servicio ha limitado las solicitudes. Espera un momento antes de repetir.');
      if (!response.ok && response.status !== 400) throw new Error(`El servicio no está disponible (HTTP ${response.status}). Inténtalo más tarde.`);
      const body: unknown = await response.json();
      if (!response.ok && kind === 'search') throw new Error('El buscador no acepta esta consulta. Prueba con el nombre de una localidad y su país.');
      return body;
    } catch (error) {
      if (signal?.aborted) throw abortError();
      if (timedOut) throw new Error('El servicio ha tardado demasiado. Comprueba la conexión y vuelve a intentarlo.');
      if (error instanceof TypeError) throw new Error('No se pudo conectar con el servicio. Comprueba Internet o el acceso CORS del proveedor.');
      if (error instanceof SyntaxError) throw new Error('El proveedor no devolvió JSON válido. Inténtalo más tarde.');
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      release();
    }
  }

  function put<T>(cache: Map<string, { expires: number; data: T }>, key: string, data: T, ttl: number): T {
    if (cache.size >= 60) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + ttl, data: structuredClone(data) });
    return data;
  }

  return {
    async search(query: string, signal?: AbortSignal): Promise<RouteEndpoint[]> {
      if (signal?.aborted) throw abortError();
      const trimmed = query.trim();
      if (trimmed.length < 3) throw new Error('Escribe al menos tres caracteres para buscar.');
      if (trimmed.length > 250) throw new Error('La búsqueda es demasiado larga (máximo 250 caracteres).');
      const key = trimmed.toLocaleLowerCase('es');
      const cached = caches.search.get(key);
      if (cached && cached.expires > Date.now()) return structuredClone(cached.data);
      const url = new URL(geocoderUrl);
      url.searchParams.set('q', trimmed);
      url.searchParams.set('limit', '5');
      const result = parseSearchResponse(await request(url, 'search', signal));
      if (signal?.aborted) throw abortError();
      return put(caches.search, key, result, 30 * 60 * 1000);
    },
    async route(origin: RouteEndpoint, destination: RouteEndpoint, signal?: AbortSignal): Promise<RouteResult> {
      if (signal?.aborted) throw abortError();
      if (!validCoordinate(origin.coordinates) || !validCoordinate(destination.coordinates)) throw new Error('Las coordenadas de origen o destino no son válidas.');
      if (origin.coordinates[0] === destination.coordinates[0] && origin.coordinates[1] === destination.coordinates[1]) throw new Error('Elige un origen y un destino diferentes.');
      const coordinates = `${origin.coordinates.join(',')};${destination.coordinates.join(',')}`;
      const cached = caches.route.get(coordinates);
      if (cached && cached.expires > Date.now()) return structuredClone(cached.data);
      const url = new URL(`${routingUrl.replace(/\/?$/, '/')}${coordinates}`);
      url.searchParams.set('geometries', 'geojson');
      url.searchParams.set('overview', 'full');
      url.searchParams.set('steps', 'true');
      url.searchParams.set('alternatives', 'false');
      url.searchParams.set('generate_hints', 'false');
      url.searchParams.set('radiuses', `${MAX_SNAP_DISTANCE_METRES};${MAX_SNAP_DISTANCE_METRES}`);
      const result = parseRouteResponse(await request(url, 'route', signal));
      if (signal?.aborted) throw abortError();
      return put(caches.route, coordinates, result, 5 * 60 * 1000);
    },
  };
}

export const routingClient = createRoutingClient();
