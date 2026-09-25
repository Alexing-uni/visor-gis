import { useMemo } from 'react';
import { Alert, Button } from 'antd';
import type { Layer } from '../model/Layer.ts';
import type { Bounds } from '../types.ts';
import { ANALYSIS_CRITERION, analyzeLayers, buildAnalysisCsv, buildAnalysisJson, selectedGeoJson } from '../lib/analysis.ts';
import type { AnalysisResult } from '../lib/analysis.ts';

type Props = {
  layers: Layer[];
  bounds: Bounds | null;
  selecting: boolean;
  onStart: () => void;
  onClear: () => void;
  result?: AnalysisResult | null;
};
const number = (value: number | null, digits = 3) => value === null ? 'No disponible' : value.toLocaleString('es-ES', { maximumFractionDigits: digits });
function download(contents: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AnalysisPanel({ layers, bounds, selecting, onStart, onClear, result: providedResult }: Props) {
  const calculation = useMemo(() => {
    try { return { result: providedResult !== undefined ? providedResult : bounds ? analyzeLayers(layers, bounds) : null, error: '' }; }
    catch (error) { return { result: null, error: error instanceof Error ? error.message : String(error) }; }
  }, [layers, bounds, providedResult]);
  const result = calculation.result;
  return <section className="tool-panel analysis-panel" aria-label="Análisis de superficie">
    <h2>Analizar una superficie</h2>
    <p>Marca dos esquinas sobre el mapa con dos clics o toques. Puedes mover el mapa antes de empezar.</p>
    <div className="tool-actions"><Button type="primary" onClick={onStart}>{selecting ? 'Reiniciar selección' : 'Dibujar rectángulo'}</Button>
      <Button onClick={onClear} disabled={!selecting && !bounds}>{selecting ? 'Cancelar' : 'Borrar selección'}</Button></div>
    {selecting && <Alert type="info" showIcon message="Toca la primera esquina y después la opuesta" description="La selección se dibuja sobre el mapa. En móvil puedes plegar el panel para disponer de más espacio."/>}
    {calculation.error && <Alert type="error" showIcon message={calculation.error}/>}
    {result && <div className="analysis-results" aria-live="polite">
      <div className="metric-grid">
        <div className="metric"><strong>{number(result.areaKm2)} km²</strong><span>Superficie seleccionada · {number(result.areaHa, 2)} ha</span></div>
        <div className="metric"><strong>{number(result.totalCount, 0)}</strong><span>Entidades afectadas</span></div>
      </div>
      <p>{number(result.counts.point, 0)} puntos · {number(result.counts.line, 0)} líneas · {number(result.counts.polygon, 0)} polígonos</p>
      <p><strong>Dentro del rectángulo:</strong><br/>Longitud de líneas: {number(result.lineLengthKm)} km<br/>Superficie de polígonos: {number(result.polygonAreaKm2)} km²</p>
      {result.layers.length === 0 && <Alert type="info" message="No hay capas vectoriales visibles para analizar."/>}
      {result.layers.map(layer => <details className="analysis-layer" key={layer.layerId} open={layer.totalCount > 0}>
        <summary><strong>{layer.layerName}</strong> · {number(layer.totalCount, 0)} entidades</summary>
        <p>{layer.counts.point} puntos · {layer.counts.line} líneas · {layer.counts.polygon} polígonos<br/>
          Longitud: {number(layer.lineLengthKm)} km · Superficie: {number(layer.polygonAreaKm2)} km²</p>
        {layer.numericStats.length > 0 ? <div className="table-scroll"><table className="analysis-table"><caption>Atributos de las entidades completas</caption><thead><tr><th>Atributo</th><th>n</th><th>Mín.</th><th>Máx.</th><th>Suma*</th><th>Media</th></tr></thead><tbody>
          {layer.numericStats.map(stats => <tr key={stats.attribute}><th scope="row">{stats.attribute}</th><td>{stats.count}</td><td>{number(stats.min)}</td><td>{number(stats.max)}</td><td>{number(stats.sum)}</td><td>{number(stats.mean)}</td></tr>)}
        </tbody></table></div> : layer.totalCount > 0 && <p>No hay atributos numéricos medibles.</p>}
        {layer.excludedNumericAttributes.length > 0 && <p className="muted">Identificadores/códigos excluidos: {layer.excludedNumericAttributes.join(', ')}.</p>}
      </details>)}
      {result.warnings.map((warning, index) => <Alert key={index} type="warning" message={warning}/>)}
      <div className="tool-actions export-actions">
        <Button onClick={() => download(buildAnalysisJson(result), 'analisis-gis.json', 'application/json;charset=utf-8')}>Resultados JSON</Button>
        <Button onClick={() => download(buildAnalysisCsv(result), 'analisis-gis.csv', 'text/csv;charset=utf-8')}>Resultados CSV</Button>
        <Button onClick={() => download(JSON.stringify(selectedGeoJson(result)), 'seleccion-gis.geojson', 'application/geo+json;charset=utf-8')}>Entidades GeoJSON</Button>
      </div>
      <p className="muted">El GeoJSON exporta las entidades completas seleccionadas en WGS84, con su capa de origen; no las recorta.</p>
    </div>}
    <details className="analysis-method"><summary>Criterio, unidades y límites</summary>
      <p>{ANALYSIS_CRITERION}</p>
      <p>Las líneas se recortan al rectángulo y los polígonos se intersectan conservando sus huecos. Se suman todas las partes de una geometría múltiple; las entidades solapadas aportan su medida por separado. Tocar un borde puede contar una entidad y aportar cero longitud o superficie.</p>
      <p>Longitudes geodésicas en km y superficies esféricas en km²/ha sobre WGS84; no son medidas topográficas. No se utiliza la altura Z ni el relieve para medir. No se admite cruzar el antimeridiano.</p>
      <p>Las estadísticas usan valores numéricos finitos de las entidades completas seleccionadas, sin prorratearlos al área. Cada atributo tiene su propio número de valores (n); no se convierten cadenas a números. Se excluyen identificadores y códigos por el nombre del campo.</p>
      <p>* Se omiten sumas de pendientes, porcentajes, temperaturas, cotas, índices de valoración y ángulos reconocidos por su nombre, y la media aritmética de orientaciones. También se excluyen índices de fila/columna y coordenadas auxiliares. Para campos importados desconocidos, confirma su significado y unidad antes de interpretar una suma o media.</p>
      <p>Las imágenes WMS/WMTS, la ortofoto y el relieve son ráster: este análisis no obtiene ni cuenta entidades en ellos. Las capas ocultas o con opacidad cero quedan fuera.</p>
    </details>
  </section>;
}
