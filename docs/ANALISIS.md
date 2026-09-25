# Análisis de superficies

La pestaña **Análisis** ofrece **Dibujar rectángulo** (arrastre o dos esquinas) y **Libre por puntos**. En modo libre, cada clic o toque añade un vértice; el trazo abierto y sus vértices se dibujan con deck.gl sin calcular resultados. Con al menos tres puntos, toca el primer vértice amarillo o pulsa **Cerrar y analizar**. Puedes mover el mapa y usar **Deshacer punto** o **Cancelar**. Al cerrar un contorno válido aparecen los mismos recuentos, estadísticas, medidas y exportaciones que en modo rectangular. **Borrar selección** permite repetir el análisis. Un nuevo dibujo retira los resultados anteriores.

## Criterio verificable

- Se estudian las capas vectoriales cargadas y visibles con opacidad mayor que cero, en sus coordenadas normalizadas WGS84.
- Una entidad se selecciona si su geometría real intersecta la selección cerrada, incluido su borde. Una comprobación inicial de envolventes descarta candidatos, pero nunca decide por sí sola la selección.
- Cada `Feature` cuenta una vez aunque sea `MultiPoint`, `MultiLineString` o `MultiPolygon`; los totales por tipo describen entidades, no vértices o componentes. Dos registros repetidos continúan siendo dos entidades.
- Una selección dentro de un hueco de un polígono no selecciona ese polígono. Un contacto de borde sí puede seleccionarlo aunque la superficie de intersección sea cero.
- Las longitudes se calculan después de recortar cada segmento al rectángulo (Liang–Barsky). En selección libre se dividen los segmentos en sus cruces con el contorno y se miden solo los intervalos interiores o de borde; esto admite varias entradas y salidas en polígonos cóncavos. Los polígonos se intersectan mediante Turf, respetando huecos y multipolígonos. Las medidas suman las partes de cada entidad; no se disuelven solapamientos entre entidades. Por ello la suma de áreas puede superar el área seleccionada.
- Turf calcula longitudes geodésicas y áreas esféricas a partir de longitud/latitud; las aristas se recortan en el plano de coordenadas GeoJSON. Se ignora Z: no se calcula longitud sobre el terreno ni superficie topográfica. No se admiten selecciones que crucen el antimeridiano o abarquen más de 180° de longitud.
- Las estadísticas corresponden a atributos **completos** de las entidades seleccionadas; no se prorratean ni se ponderan por el área recortada. Solo se usan valores JavaScript numéricos y finitos; cadenas, nulos y valores no numéricos se omiten. El número `n` puede ser distinto por atributo. Los nombres identificadores/códigos (`id`, `fid`, `objectid`, `codigo`, etc., incluidos tokens separados por guiones/barras bajas) se excluyen con `isIdentifierAttribute`. La regla también excluye coordenadas técnicas `left`, `right`, `top`, `bottom`, índices y códigos como `Riesgo` o `HasData`.
- Se muestran mínimo, máximo, suma y media cuando proceden. Una heurística por nombre omite sumas de orientaciones, pendientes, valoraciones, confianza, porcentajes, tasas, temperaturas y altitudes/cotas. Las orientaciones tampoco reciben media aritmética, ya que requieren tratamiento circular. Estas reglas se pueden ajustar en `collectStats`; no constituyen un diccionario universal de atributos. La suma solo es interpretable para medidas aditivas y la aplicación no conoce las unidades o el significado de todos los atributos importados. Se mantienen las unidades originales sin inventarlas. Una suma que desborde la precisión finita también se indica como no disponible.
- Un error de intersección se notifica y esa entidad no se cuenta; un error de medición mantiene la entidad seleccionada pero marca la métrica de su capa y el total como no disponibles. No se sustituyen fallos por resultados ficticios.
- WMS, WMTS, ortofoto y relieve son imágenes/ráster y no participan. Para contar ríos u otros elementos debe importarse una fuente vectorial, por ejemplo GeoJSON, además del servicio de imagen.

## Exportación

**JSON** guarda el contorno GeoJSON cerrado en `selection`, su tipo en `selectionKind`, la envolvente en `bounds`, criterio, totales y estadísticas. **CSV** contiene una fila por medida o estadístico, con separador `;`, UTF-8 con BOM y neutralización de fórmulas en etiquetas importadas. **GeoJSON** exporta las entidades seleccionadas completas (sin recortar), con campos `_visor_layer_id` y `_visor_layer_name`; esos dos nombres están reservados para identificar la capa de origen.

## Archivos para ampliar el análisis

- `src/lib/analysis.ts`: tipos de resultados, criterio, mediciones, identificación de atributos y exportaciones.
- `src/components/AnalysisPanel.tsx`: controles, resultados y explicación visible.
- `src/components/MapView.tsx`: interacción y resaltado con deck.gl.
- `tests/analysis.test.mjs`: casos de intersección real, huecos, geometrías múltiples, contactos, recorte y exportación.

Ejemplo de integración:

```ts
import { analyzeLayers } from './lib/analysis.ts';
const report = analyzeLayers(models, [-6, 43, -5, 44]);
console.log(report.totalCount, report.lineLengthKm);
// report.selectedByLayer[id] alimenta una capa de resaltado deck.gl.
```

El cálculo se ejecuta en el navegador y recorre las entidades cargadas. Para millones de objetos serían necesarios un índice espacial, ejecución en un trabajador o análisis en un servicio geográfico. Las geometrías deben ser válidas; la importación comprueba estructura y coordenadas pero no corrige toda topología defectuosa.

## Validación del dibujo libre

Admite un contorno simple y cóncavo, sin huecos. Requiere tres vértices distintos y superficie positiva; rechaza lados cruzados, vértices repetidos, puntos alineados y selecciones que crucen el antimeridiano. Los errores permiten seguir deshaciendo y corrigiendo, sin mostrar resultados parciales. La geometría se valida en `selectionPolygon` de `src/lib/analysis.ts`. El borrador vive en `src/components/MapView.tsx`; `src/App.tsx` recibe solo el polígono confirmado y lo analiza.
