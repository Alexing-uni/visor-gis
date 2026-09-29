# Cambios del visor

## 1.1.0 — 28 de septiembre de 2026

Versión 1.1 publicada mediante el repositorio `Alexing-uni/visor-gis`. GitHub Actions compila y despliega Pages al actualizar `main`. El estado del despliegue se comprueba en Actions.

### Qué cambia respecto a la 1.0

| Cambio | Cómo se hizo y dónde |
| --- | --- |
| Capas que flotaban al inclinar el mapa | `src/lib/elevation.ts` crea una copia para dibujar sin Z propia. Los originales conservan sus alturas. |
| Terreno 3D y capas sobre la misma superficie | `src/components/MapView.tsx` usa `TerrainLayer` de deck.gl y `TerrainExtension` con `drape`. MapLibre conserva la cámara y el fondo 2D. La exageración va de 0 a 3. |
| Paso entre 2D y 3D | Las capas reciben identificadores diferentes según el modo para inicializar el efecto de terreno y retirarlo correctamente al volver a 2D. |
| Imágenes adaptadas al relieve | `TileLayer` y `BitmapLayer` conservan las propiedades de la extensión de terreno; la imagen se pasa como textura, no como datos vectoriales. |
| Cobertura regional | `MapView.tsx` mantiene el fondo global debajo de las imágenes. PNOA cubre España y sus píxeles transparentes dejan ver Portugal. `raster.ts` ordena los fondos y las superposiciones. |
| Selector de fuentes | `SourcesPanel.tsx` permite elegir Mapa base regional o Capa superpuesta. Solo hay una imagen base regional activa; las temáticas se conservan. |
| Área de alcance | `serviceArea.ts` consulta acceso a carretera y después la isócrona de Valhalla. `ServiceAreaPanel.tsx` ofrece origen, minutos, cancelación, borrado y exportación. |
| Integración del alcance | `App.tsx` añade el panel y su estado; `MapView.tsx` dibuja el contorno y el origen. `RoutePanel.tsx` comparte su buscador con el panel nuevo. |
| Móvil | Al elegir el origen se pliega el panel; el encuadre del resultado reserva espacio para el panel inferior. |
| Dependencias | Se añaden dependencias directas de `@deck.gl/extensions` y `@loaders.gl/terrain`; el trabajador del terreno se empaqueta con Vite. El lockfile conserva las versiones concretas. |
| Pruebas | `tests/terrain-service-area.test.mjs` añade seis pruebas de Z, decodificación, fondos, isócronas, errores y falta de acceso. Total: 48. |
| Documentación y versión | Paquete y lockfile en 1.1.0, interfaz en 1.1, README y guías corregidos; informe `docs/Visor_GIS_1.1.docx` generado desde `docs/MEMORIA.md`. |

Se conservan los datos originales, las claves de almacenamiento y las herramientas anteriores. El nombre interno de IndexedDB no se cambia para evitar perder datos guardados.

### Lo que ya estaba en la 1.0

- Selección rectangular y libre por puntos, que calcula solo al cerrar.
- Intersección real, una entidad por Feature, estadísticas, medidas interiores y exportación.
- Revisión independiente del recuento: 45 casos coincidentes con Shapely/GEOS.
- Capas configurables, paneles plegables, importación y fuentes oficiales.
- Rutas reales en coche con Photon y OSRM.
- Backend Express/SQLite y modo estático con IndexedDB para Pages.
- Workflow de Pages que conserva un registro de despliegue después de publicar correctamente.

### Qué sigue limitado

El alcance es aproximado y no representa batería o tráfico. Los transportes disponibles son en coche. El terreno no modela edificios ni puentes y su extensión es experimental. WMS/WMTS aportan imágenes, no entidades contables. No hay usuarios ni almacenamiento compartido. La revisión visual del Word queda pendiente por ausencia de LibreOffice en el entorno; su estructura y contenido se han comprobado.

Consulta el [informe](docs/MEMORIA.md) para la explicación completa y las [comprobaciones](docs/VERIFICACION.md) para separar evidencia actual y anterior.
