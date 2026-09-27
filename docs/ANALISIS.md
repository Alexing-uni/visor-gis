# Analizar una zona

Abre **Análisis** y elige una forma:

- **Rectángulo**: arrastra sobre el mapa o marca dos esquinas.
- **Libre por puntos**: marca al menos tres vértices. Pulsa el primer punto o **Cerrar y analizar**. Mientras esté abierta, no se calculan resultados. Puedes deshacer puntos o cancelar.

La figura debe tener superficie y no cruzarse consigo misma. Puedes borrar la selección y empezar otra. En pantallas pequeñas, pliega el panel para disponer de más mapa.

## Qué se cuenta

Se incluyen las entidades que **intersectan o tocan** la selección, usando su geometría real. Cada registro GeoJSON cuenta una vez: una geometría múltiple también cuenta una sola vez aunque tenga varias partes dentro.

Solo se analizan capas vectoriales visibles con opacidad mayor que cero. Las imágenes WMS/WMTS y el relieve no se cuentan. Los registros duplicados o importados en dos capas siguen siendo registros distintos.

## Qué significan los resultados

Se muestra la superficie seleccionada, el total y el recuento por capa. Las longitudes y superficies se calculan para la parte interior de la selección. Las superficies de polígonos superpuestos se suman; no se calcula una unión sin solapamientos.

Las estadísticas usan los atributos numéricos completos de las entidades seleccionadas, sin repartirlos según la fracción que queda dentro. Se omiten identificadores y sumas que no tienen sentido. No se mide longitud sobre el relieve.

Puedes exportar el resumen en JSON o CSV y las entidades completas en GeoJSON. Los avisos de datos sin cargar o geometrías problemáticas pueden indicar un resultado parcial.

Código: `src/lib/analysis.ts`, `src/components/AnalysisPanel.tsx` y `src/components/MapView.tsx`. Consulta la [revisión del recuento](RECUENTO.md).
