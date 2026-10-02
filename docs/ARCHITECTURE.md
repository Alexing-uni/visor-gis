# Cómo está organizado

La aplicación tiene una interfaz en el navegador y un servidor opcional para el modo local.

| Carpeta o archivo | Para qué sirve |
| --- | --- |
| `src/App.tsx` | Conecta los paneles y el estado de la aplicación. |
| `src/components/MapView.tsx` | Dibuja el mapa, las capas y las selecciones. |
| `src/components/` | Paneles de capas, análisis, rutas, isócronas e importación; servicios integrados en Capas y selector de fondos en el mapa. |
| `src/lib/` | Cálculos geográficos, rutas, isócronas, alturas, edificios, tonos 3D, importación y almacenamiento. |
| `src/lib/basemaps.ts`, `terrainSource.ts`, `satelliteSource.ts` | Catálogo de fondos y carga de elevaciones e imágenes, con recuperación de niveles disponibles. |
| `src/model/` | Tipos de capas y atributos que se muestran. |
| `src/hooks/useLayers.ts` | Carga las capas y guarda sus ajustes. |
| `src/config/defaultLayers.ts` | Capas iniciales del modo estático. |
| `public/data/` | Archivos geográficos que carga el navegador. |
| `server/` | API local y SQLite. |
| `tests/` | Pruebas automáticas. |
| `.github/workflows/` | Comprobación y publicación en GitHub. |

## Recorrido de los datos

El visor lee la configuración, carga el GeoJSON y transforma las coordenadas cuando hace falta. En 2D, deck.gl dibuja sobre MapLibre. En 3D, deck.gl dibuja tanto el terreno como las capas adaptadas a él; MapLibre conserva la cámara. Al seleccionar una zona, Turf calcula las intersecciones y el panel muestra los resultados.

En local, Express y SQLite guardan la configuración de las capas originales; sus geometrías siguen en archivos. En Pages, esa configuración se guarda en IndexedDB, dentro del navegador. Las importaciones también se guardan allí en ambos modos. Las preferencias de imágenes usan localStorage.

React organiza la interfaz, TypeScript comprueba los tipos y Vite prepara los archivos para publicar. La explicación resumida de las decisiones está en el [informe](MEMORIA.md).
