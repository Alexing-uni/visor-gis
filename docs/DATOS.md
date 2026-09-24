# Datos del tutor y tratamiento espacial

Origen: archivos del ZIP GIS_Proyectin.zip suministrado por el usuario. El PDF incluido coincide byte por byte con la guía revisada previamente.

| Archivo | Entidades | Geometría | CRS declarado | Zona |
| --- | ---: | --- | --- | --- |
| Point 2.geojson | 9.999 | Point, XY | EPSG:31994 | Chile |
| Polygon 2.geojson | 399 | Polygon, XY | OGC:CRS84 | Chile |
| Polyline2 1.geojson | 6.233 | MultiLineString, XYZ | EPSG:4258 | Asturias, España |

Los nombres de destino son los que ya utiliza la API. El contenido de cada archivo se conserva exactamente. La transformación se realiza sobre una nueva colección en memoria; no se reescriben los originales.

## Extensión tras normalizar

Formato: [oeste, sur, este, norte], en grados.

- Puntos: [-73.02543635, -40.11667734, -72.42921075, -39.64873933].
- Polígonos: [-73.72300428, -40.67044155, -71.50559958, -39.01764773].
- Líneas: [-5.89337700, 43.32904700, -5.80209896, 43.39764500].

La separación entre Chile y Asturias es real en estos archivos. No se deben desplazar ni cambiar artificialmente sus coordenadas para hacerlos coincidir. El visor abre encuadrando los puntos; el botón Encuadrar de Viales lleva a Asturias.

## Transformación

Se registran explícitamente EPSG:31994 (SIRGAS 1995 / UTM 19S) y EPSG:4258 (ETRS89). La transformación de datum con parámetros nulos es una aproximación orientada a visualización, no una operación geodésica de precisión. Para trabajo topográfico, el tutor debe confirmar la transformación y precisión requeridas.

El CRS84 de los polígonos representa WGS84 con orden longitud–latitud. Se trata como compatible con las coordenadas EPSG:4326 usadas por el visor, sin invertir ejes. La Z de las líneas se conserva; no se transforma su referencia vertical. No se añade un modelo de elevación del terreno.

Se valida la estructura, el tipo de geometría esperado, la finitud de las coordenadas, el cierre de los anillos y la coherencia entre CRS declarado y configurado. No se analiza aquí la topología completa (por ejemplo, autointersecciones).

Los campos Pend_1 y Orient_1 se muestran como valores originales: no se asumen unidades ni se recalculan. Los demás atributos también se conservan y cada modelo define los que muestra el popup.

## Integridad

| Nombre recibido | Destino | SHA-256 |
| --- | --- | --- |
| `Point 2.geojson` | `public/data/points.geojson` | `40df5aaf9b8c6a5406555d4f508a6f69707c631886f5390259914f379c6734d0` |
| `Polygon 2.geojson` | `public/data/polygons.geojson` | `ea8150e73e0071565462c1471af824a735ea66151a75128f3af1c3eca220b3bc` |
| `Polyline2 1.geojson` | `public/data/lines.geojson` | `7950b96fb89cdbdcc676ce75df7d78479b2c60a95b3efcc66d991f8a2b084363` |
