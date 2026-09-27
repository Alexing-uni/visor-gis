# Datos e importación

## Datos incluidos

Los archivos originales se conservan en `public/data/`:

| Archivo | Contenido | Registros | Coordenadas de origen |
| --- | --- | --- | --- |
| `points.geojson` | Puntos de Chile | 9.999 | EPSG:31994 |
| `lines.geojson` | Viales de Asturias | 6.233 | EPSG:4258 |
| `polygons.geojson` | Geología de Chile | 399 | EPSG:4326 |

Son los datos recibidos con el proyecto anterior. Estos nombres no acreditan por sí solos una licencia de redistribución. `example-import.geojson` contiene cuatro entidades ficticias para practicar.

## Importar

En el panel de importación, elige un archivo GeoJSON o su enlace directo. El límite es 30 MiB. Se admiten puntos, líneas y polígonos, también múltiples; las colecciones mixtas se separan por tipo. Los sistemas de coordenadas admitidos son EPSG:4326, 4258, 3857 y 31994.

Una página con un visor no es un GeoJSON. Un WMS sirve imágenes y se añade como fuente de mapa. Los WMTS requieren una plantilla compatible; no se interpreta automáticamente cualquier servicio. Shapefile, KML y GeometryCollection necesitan conversión previa, por ejemplo con QGIS.

Si un enlace falla, comprueba que devuelve datos, usa HTTPS y permite acceso desde otro sitio (CORS). Descargar el archivo e importarlo localmente puede resolver un bloqueo CORS.

## Añadir una capa permanente

1. Copia el GeoJSON a `public/data/`.
2. Copia una entrada de `src/config/defaultLayers.ts` y cambia identificador, nombre, archivo, tipo, coordenadas y estilo.
3. Añade su equivalente a `server/database.js` para nuevas instalaciones locales.
4. Ajusta los atributos mostrados en `src/model/` si lo necesitas.

Una base SQLite existente conserva su configuración: cambiar los valores iniciales no la actualiza automáticamente. Prepara una migración si quieres modificarla sin perder ajustes.

Las importaciones se guardan en el navegador, no se suben al servidor ni al repositorio. Exporta una copia si quieres conservarlas fuera de ese navegador.
