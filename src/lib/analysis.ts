import { area, bbox, bboxPolygon, booleanIntersects, booleanPointInPolygon, distance, featureCollection, intersect, kinks } from '@turf/turf';
import type { Feature, LineString, MultiLineString, MultiPolygon, Polygon, Position } from 'geojson';
import type { Layer } from '../model/Layer.ts';
import type { Bounds, Collection, Kind, VectorFeature } from '../types.ts';

export type GeometryCounts = Record<Kind, number>;
export type NumericStats = { attribute: string; count: number; min: number; max: number; sum: number | null; mean: number | null };
export type LayerAnalysis = {
  layerId: string;
  layerName: string;
  totalCount: number;
  counts: GeometryCounts;
  lineLengthKm: number | null;
  polygonAreaKm2: number | null;
  numericStats: NumericStats[];
  excludedNumericAttributes: string[];
};
export type AnalysisResult = {
  bounds: Bounds;
  selection: Feature<Polygon>;
  selectionKind: 'rectangle' | 'polygon';
  areaM2: number;
  areaKm2: number;
  areaHa: number;
  totalCount: number;
  counts: GeometryCounts;
  lineLengthKm: number | null;
  polygonAreaKm2: number | null;
  layers: LayerAnalysis[];
  selectedByLayer: Record<string, Collection>;
  hiddenLayerCount: number;
  warnings: string[];
};

export const ANALYSIS_CRITERION = 'Intersección de la geometría real con la selección cerrada (rectángulo o polígono libre), incluido su borde. Cada Feature se cuenta una vez; las geometrías Multi cuentan como una entidad. Solo se analizan las capas vectoriales visibles con opacidad mayor que cero.';
const emptyCounts = (): GeometryCounts => ({ point: 0, line: 0, polygon: 0 });
const geometryKind = (feature: VectorFeature): Kind => /Point$/.test(feature.geometry.type) ? 'point' : /LineString$/.test(feature.geometry.type) ? 'line' : 'polygon';

/** IDs/codes are labels, even when their storage type happens to be numeric. */
export function isIdentifierAttribute(name: string): boolean {
  const normalized = name.replace(/([a-z])([A-Z])/g, '$1_$2').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /^(left|right|top|bottom|row_index|col_index|riesgo|has_data|hasdata)$/.test(normalized) || normalized.split(/[^a-z0-9]+/).some(token => /^(?:id|ids|fid|gid|oid|uuid|guid|objectid|pk|code|codigo|cod|codi|identificador|identif|index)\d*$/.test(token));
}

export function selectionRectangle(bounds: Bounds): Feature<Polygon> {
  const [west, south, east, north] = bounds;
  if (!bounds.every(Number.isFinite) || west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
    throw new Error('Selecciona dos esquinas distintas para formar un rectángulo válido en longitud/latitud.');
  }
  if (east - west > 180) throw new Error('La selección no puede cruzar el antimeridiano ni abarcar más de 180° de longitud.');
  return bboxPolygon(bounds);
}

/** Called only on explicit closure: an unfinished ring is never an analysis area. */
export function selectionPolygon(vertices: Position[]): Feature<Polygon> {
  const points = vertices.map(p => [p[0], p[1]]);
  if (points.length > 1 && points[0][0] === points.at(-1)![0] && points[0][1] === points.at(-1)![1]) points.pop();
  if (points.length < 3 || new Set(points.map(p => p.join(','))).size !== points.length) throw new Error('Marca al menos tres vértices distintos, sin repetir puntos, antes de cerrar.');
  if (points.some(p => !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)) throw new Error('El polígono contiene coordenadas no válidas.');
  const polygon: Feature<Polygon> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...points, [...points[0]]]] } };
  const extent = bbox(polygon) as Bounds;
  selectionRectangle(extent); // Same coordinate/antimeridian constraints as rectangles.
  if (kinks(polygon).features.length) throw new Error('Los lados del polígono se cruzan. Deshaz los últimos puntos y vuelve a cerrarlo.');
  const [ox,oy] = points[0];
  const planarArea = points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+(p[0]-ox)*(q[1]-oy)-(q[0]-ox)*(p[1]-oy);},0);
  const scale = Math.max(extent[2]-extent[0],extent[3]-extent[1]);
  if (Math.abs(planarArea) <= Number.EPSILON*scale*scale*points.length) throw new Error('El polígono necesita una superficie mayor que cero; los puntos no pueden estar alineados.');
  if (area(polygon) <= 0) throw new Error('El polígono necesita una superficie mayor que cero; los puntos no pueden estar alineados.');
  return polygon;
}

/** Split a segment at every ring crossing, then measure only interior/border intervals.
 * Handles concave selections, multiple entries and collinear boundary segments. */
function lineLengthInPolygon(geometry: LineString | MultiLineString, polygon: Feature<Polygon>): number {
  const lines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
  const ring = polygon.geometry.coordinates[0];
  const cross = (ax:number, ay:number, bx:number, by:number) => ax * by - ay * bx;
  let total = 0;
  for (const line of lines) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b[0] - a[0], dy = b[1] - a[1];
    if (dx === 0 && dy === 0) continue;
    const cuts = [0, 1], at = (t:number):Position => [a[0] + dx*t, a[1] + dy*t];
    for (let j = 1; j < ring.length; j++) {
      const c = ring[j - 1], d = ring[j], ex = d[0]-c[0], ey = d[1]-c[1], qx = c[0]-a[0], qy = c[1]-a[1];
      const denominator = cross(dx,dy,ex,ey);
      if (denominator !== 0) {
        const t = cross(qx,qy,ex,ey)/denominator, u = cross(qx,qy,dx,dy)/denominator;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) cuts.push(t);
      } else if (cross(qx,qy,dx,dy) === 0) {
        for (const p of [c,d]) { const t = Math.abs(dx) >= Math.abs(dy) ? (p[0]-a[0])/dx : (p[1]-a[1])/dy; if (t > 0 && t < 1) cuts.push(t); }
      }
    }
    const ordered = [...new Set(cuts)].sort((x,y)=>x-y);
    for (let j = 1; j < ordered.length; j++) {
      const start = ordered[j-1], end = ordered[j];
      if (booleanPointInPolygon(at((start+end)/2),polygon)) total += distance(at(start),at(end),{units:'kilometers'});
    }
  }
  return total;
}

/** Liang–Barsky clips the actual segment, not its bounding box. GeoJSON edges are
 * linear in longitude/latitude; the resulting segment length is geodesic (km). */
function clipSegment(start: Position, end: Position, bounds: Bounds): [Position, Position] | null {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const p = [-dx, dx, -dy, dy];
  const q = [start[0] - bounds[0], bounds[2] - start[0], start[1] - bounds[1], bounds[3] - start[1]];
  let lower = 0, upper = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return null; continue; }
    const ratio = q[i] / p[i];
    if (p[i] < 0) lower = Math.max(lower, ratio);
    else upper = Math.min(upper, ratio);
    if (lower > upper) return null;
  }
  return [[start[0] + lower * dx, start[1] + lower * dy], [start[0] + upper * dx, start[1] + upper * dy]];
}

export function clippedLineLengthKm(geometry: LineString | MultiLineString, bounds: Bounds): number {
  const lines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
  let total = 0;
  for (const positions of lines) {
    for (let i = 1; i < positions.length; i++) {
      const segment = clipSegment(positions[i - 1], positions[i], bounds);
      if (segment) total += distance(segment[0], segment[1], { units: 'kilometers' });
    }
  }
  return total;
}

function collectStats(features: VectorFeature[]): { numericStats: NumericStats[]; excludedNumericAttributes: string[] } {
  const stats = new Map<string, NumericStats>();
  const excluded = new Set<string>();
  for (const feature of features) {
    for (const [attribute, value] of Object.entries(feature.properties ?? {})) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (isIdentifierAttribute(attribute)) { excluded.add(attribute); continue; }
      const current = stats.get(attribute);
      if (!current) { stats.set(attribute, { attribute, count: 1, min: value, max: value, sum: value, mean: value }); continue; }
      current.count++;
      current.min = Math.min(current.min, value);
      current.max = Math.max(current.max, value);
      const sum = current.sum === null ? null : current.sum + value;
      current.sum = sum !== null && Number.isFinite(sum) ? sum : null;
      // Weighted incremental mean avoids overflow from adding very large values.
      current.mean = current.mean! * ((current.count - 1) / current.count) + value / current.count;
    }
  }
  const numericStats = [...stats.values()].map(stat => {
    const name = stat.attribute.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    // Known non-additive quantities: report range/mean, but never a meaningless total.
    const angular = /orient|bearing|azimut|aspect/.test(name);
    if (angular || /pend|slope|rating|confidence|percent|porcent|ratio|tasa|temperature|temperatura|elevation|altitud|cota/.test(name)) stat.sum = null;
    if (angular) stat.mean = null; // Arithmetic mean of bearings is not a circular mean.
    return stat;
  }).sort((a, b) => a.attribute.localeCompare(b.attribute));
  return { numericStats, excludedNumericAttributes: [...excluded].sort() };
}

export function analyzeLayers(layers: Layer[], input: Bounds | Feature<Polygon>): AnalysisResult {
  if (!Array.isArray(input) && (input.geometry.type !== 'Polygon' || input.geometry.coordinates.length !== 1)) throw new Error('La selección libre debe ser un polígono de un solo contorno.');
  if (!Array.isArray(input)) {
    const ring = input.geometry.coordinates[0];
    if (ring.length < 4 || ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) throw new Error('Cierra el polígono antes de calcular los resultados.');
  }
  const isRectangle = Array.isArray(input);
  const selection = isRectangle ? selectionRectangle(input) : selectionPolygon(input.geometry.coordinates[0]);
  const bounds = bbox(selection) as Bounds;
  const areaM2 = area(selection);
  const result: AnalysisResult = {
    bounds: [...bounds], selection, selectionKind: isRectangle ? 'rectangle' : 'polygon', areaM2, areaKm2: areaM2 / 1e6, areaHa: areaM2 / 1e4,
    totalCount: 0, counts: emptyCounts(), lineLengthKm: 0, polygonAreaKm2: 0,
    layers: [], selectedByLayer: Object.create(null) as Record<string, Collection>, hiddenLayerCount: 0, warnings: [],
  };
  for (const layer of layers) {
    if (!layer.config.visible || layer.config.opacity <= 0) { result.hiddenLayerCount++; continue; }
    const selected: VectorFeature[] = [];
    const summary: LayerAnalysis = { layerId: layer.id, layerName: layer.name, totalCount: 0, counts: emptyCounts(), lineLengthKm: 0, polygonAreaKm2: 0, numericStats: [], excludedNumericAttributes: [] };
    for (let index = 0; index < layer.data.features.length; index++) {
      const feature = layer.data.features[index];
      try {
        const extent = bbox(feature);
        if (extent[2] < bounds[0] || extent[0] > bounds[2] || extent[3] < bounds[1] || extent[1] > bounds[3]) continue;
        if (!booleanIntersects(feature, selection)) continue;
      } catch (error) {
        result.warnings.push(`${layer.name}, entidad ${index + 1}: no se pudo comprobar la intersección (${error instanceof Error ? error.message : String(error)}).`);
        continue;
      }
      selected.push(feature);
      const kind = geometryKind(feature);
      summary.counts[kind]++;
      try {
        if (kind === 'line') {
          const geometry = feature.geometry as LineString | MultiLineString;
          const length = isRectangle ? clippedLineLengthKm(geometry, bounds) : lineLengthInPolygon(geometry, selection);
          if (!Number.isFinite(length)) throw new Error('Longitud no finita');
          if (summary.lineLengthKm !== null) summary.lineLengthKm += length;
        } else if (kind === 'polygon') {
          const clipped = intersect(featureCollection<Polygon | MultiPolygon>([feature as Feature<Polygon | MultiPolygon>, selection]));
          const clippedArea = clipped ? area(clipped) / 1e6 : 0;
          if (!Number.isFinite(clippedArea)) throw new Error('Superficie no finita');
          if (summary.polygonAreaKm2 !== null) summary.polygonAreaKm2 += clippedArea;
        }
      } catch (error) {
        if (kind === 'line') summary.lineLengthKm = null;
        if (kind === 'polygon') summary.polygonAreaKm2 = null;
        result.warnings.push(`${layer.name}, entidad ${index + 1}: seleccionada, pero no se pudo medir su geometría recortada (${error instanceof Error ? error.message : String(error)}). La métrica afectada se marca como no disponible.`);
      }
    }
    summary.totalCount = selected.length;
    Object.assign(summary, collectStats(selected));
    result.layers.push(summary);
    result.selectedByLayer[layer.id] = { type: 'FeatureCollection', features: selected };
    result.totalCount += selected.length;
    for (const kind of ['point', 'line', 'polygon'] as const) result.counts[kind] += summary.counts[kind];
    result.lineLengthKm = result.lineLengthKm === null || summary.lineLengthKm === null ? null : result.lineLengthKm + summary.lineLengthKm;
    result.polygonAreaKm2 = result.polygonAreaKm2 === null || summary.polygonAreaKm2 === null ? null : result.polygonAreaKm2 + summary.polygonAreaKm2;
  }
  return result;
}

export function buildAnalysisJson(result: AnalysisResult): string {
  const { selectedByLayer: _selected, ...summary } = result;
  return JSON.stringify({ criterion: ANALYSIS_CRITERION, measurement: 'Geometrías recortadas; distancia geodésica y superficie esférica WGS84. Z ignorada. Las superficies y longitudes de entidades superpuestas se suman, no se disuelven.', attributeStatistics: 'Atributos completos de las entidades seleccionadas, sin prorratear. Solo números finitos, excluidos identificadores/códigos por nombre. La suma solo es interpretable para atributos aditivos.', ...summary }, null, 2);
}

function csvValue(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  // Prevent imported labels from becoming formulas when the CSV is opened in Excel.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Tidy CSV: one measured quantity or attribute statistic per row; semicolon for es-ES Excel. */
export function buildAnalysisCsv(result: AnalysisResult): string {
  const rows: unknown[][] = [['capa_id', 'capa', 'medida', 'atributo', 'unidad', 'n', 'valor']];
  rows.push(['', 'Selección', 'superficie', '', 'km²', '', result.areaKm2], ['', 'Selección', 'entidades', '', 'entidades', '', result.totalCount]);
  for (const layer of result.layers) {
    const add = (measure: string, unit: string, value: number | null, attribute = '', count: number | '' = '') => rows.push([layer.layerId, layer.layerName, measure, attribute, unit, count, value]);
    add('entidades', 'entidades', layer.totalCount);
    add('puntos', 'entidades', layer.counts.point);
    add('líneas', 'entidades', layer.counts.line);
    add('polígonos', 'entidades', layer.counts.polygon);
    add('longitud_recortada', 'km', layer.lineLengthKm);
    add('superficie_recortada', 'km²', layer.polygonAreaKm2);
    for (const stats of layer.numericStats) {
      for (const [key, label] of [['min', 'mínimo'], ['max', 'máximo'], ['sum', 'suma'], ['mean', 'media']] as const) add(label, 'unidad del atributo', stats[key], stats.attribute, stats.count);
    }
  }
  return '\uFEFF' + rows.map(row => row.map(csvValue).join(';')).join('\r\n');
}

/** Original selected features are exported whole; no geometry/attribute loss from clipping. */
export function selectedGeoJson(result: AnalysisResult): Collection {
  return { type: 'FeatureCollection', features: result.layers.flatMap(layer => result.selectedByLayer[layer.layerId].features.map(feature => ({
    ...feature, properties: { ...feature.properties, _visor_layer_id: layer.layerId, _visor_layer_name: layer.layerName },
  }))) };
}
