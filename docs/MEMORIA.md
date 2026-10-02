# Visor GIS web

Memoria resumida de la versión 1.2 · 2 de octubre de 2026

Esta memoria explica la utilidad del visor, cómo se implementa y qué archivos permiten ampliarlo. Las comprobaciones se recogen en `docs/VERIFICACION.md`.

En Word, actualiza el índice con el botón derecho y «Actualizar campo».

## 1 Objetivo y utilidad

El visor permite consultar datos geográficos desde el navegador. Por ejemplo, contar tramos de carretera dentro de una zona de Asturias, consultar la ortofoto de España o estimar el área accesible en coche en 20 minutos. Los paneles toman como referencia funcional Global Nature Watch, adaptada a este proyecto.

## 2 Alcance y cambios de versión

Se conservan React, TypeScript, deck.gl, los datos originales y el backend local. La 1.0 incorporó capas, análisis rectangular y libre, rutas, importación y Pages. La 1.1 añadió isócronas y un terreno único para apoyar las capas sin que flotasen; también mantuvo el fondo fuera de PNOA.

La 1.2 elimina el acceso separado «Fuentes», reúne los fondos en «Mapa y relieve» y coloca hidrografía en «Capas». Añade Cartográfico en color y Satélite global; PNOA siempre conserva imágenes fuera de España aunque antes se usara Oscuro. Cambia «Alcance» por «Isócronas», ajusta la iluminación del terreno, incorpora Mapterhorn como fuente de alturas y añade edificios con volumen opcionales. Edición de geometrías, usuarios y datos compartidos siguen pendientes.

## 3 Funcionalidades y cumplimiento

| Función | Estado real |
| --- | --- |
| Capas e interfaz | Estilos, leyenda, opacidad, orden, panel plegable y adaptación a pantallas pequeñas. Hidrografía y otros servicios se gestionan en Capas. |
| Análisis | Rectángulo y polígono libre cerrado; recuentos, estadísticas, medidas interiores, resaltado y exportación. |
| Rutas | Búsqueda, puntos en mapa, intercambio, recorrido real, distancia, duración e indicaciones en coche. |
| Isócronas | Contorno aproximado accesible desde un origen en 5–60 minutos y exportación GeoJSON. |
| Mapa y 3D | Claro, Oscuro, Cartográfico, Satélite y PNOA; relieve Mapterhorn o AWS con capas adaptadas y edificios opcionales de altura orientativa. |
| Importación y almacenamiento | GeoJSON y WMS/WMTS compatibles; backend local y modo estático con almacenamiento del navegador. |
| Pendiente | Usuarios, datos compartidos, otros transportes, tráfico y optimización para grandes conjuntos. |

## 4 Tecnologías y motivo de uso

| Tecnología | Para qué se utiliza y por qué |
| --- | --- |
| React y TypeScript | Dividen la interfaz en componentes y comprueban los tipos antes de ejecutar. |
| Vite | Sirve el desarrollo y genera los archivos estáticos de publicación. |
| deck.gl | Motor principal: dibuja vectores, imágenes, selecciones, rutas, terreno y edificios con la GPU. |
| MapLibre | Controla cámara, navegación y fondo 2D; MapboxOverlay sincroniza la vista con deck.gl. |
| Turf y proj4 | Calculan intersecciones y medidas y transforman coordenadas. |
| loaders.gl y TerrainExtension | Decodifican teselas y adaptan capas a la malla del terreno. |
| Ant Design y CSS | Aportan formularios y paneles adaptados al tamaño de pantalla. |
| Node.js, Express y SQLite | Ejecutan la API local y conservan la configuración de capas. |
| IndexedDB y localStorage | Guardan importaciones, configuración y preferencias en el navegador. |
| GitHub Actions y Pages | Comprueban, compilan y publican el modo estático. |

## 5 Estructura del proyecto

- `src/App.tsx`: conecta paneles y estado general.
- `src/components/MapView.tsx`: conecta la cámara de MapLibre y el dibujo deck.gl.
- `src/components/`: paneles de capas, análisis, rutas, isócronas e importación.
- `src/lib/`: cálculos, proveedores, coordenadas, imágenes y almacenamiento; `basemaps.ts` registra fondos, `terrainSource.ts` carga alturas, `buildings.ts` valida edificios y `basemapTone.ts` ajusta los tonos 3D.
- `src/model/`: PointLayer, LineLayer y PolygonLayer, con estilos y atributos.
- `src/hooks/useLayers.ts`: carga capas y guarda su configuración.
- `src/config/defaultLayers.ts` y `server/database.js`: configuración inicial estática y local.
- `public/data/`, `server/`, `tests/`, `docs/`: datos, API, pruebas y documentación.
- `pages.yml`, `vite.config.ts` y `package.json`: publicación, compilación, comandos y versión.

## 6 Flujo de datos

`useLayers.ts` lee la configuración de la API local o del almacenamiento estático. Carga los GeoJSON y `geojson.ts` valida geometrías y coordenadas. Las clases de `src/model/` crean las capas que dibuja `MapView.tsx`.

Al cambiar un control, React actualiza el mapa y guarda las preferencias correspondientes. El análisis se calcula en el navegador. Rutas e isócronas consultan proveedores externos; deck.gl dibuja sus respuestas. WMS devuelve imágenes y las teselas de edificios y relieve se cargan según la vista.

## 7 Procedencia de bibliotecas y datos

Las bibliotecas se instalan desde npm. `package.json` declara dependencias y `package-lock.json` fija versiones para repetir la instalación. Importar `@deck.gl/layers` utiliza una biblioteca; importar `../lib/analysis.ts` utiliza código propio.

Se mantienen 9.999 puntos de Chile en EPSG:31994, 6.233 entidades de líneas de Asturias en EPSG:4258 y 399 polígonos de Chile en EPSG:4326. Son datos heredados; no se ha acreditado una nueva licencia de redistribución. `example-import.geojson` contiene cuatro entidades ficticias para practicar.

PNOA e hidrografía proceden de IGN/IDEE. OpenFreeMap aporta cartografía y edificios basados en OpenStreetMap; OpenMapTiles aporta su esquema de datos. VersaTiles aporta imágenes globales de Sentinel-2 y ortofotos regionales, entre ellas Portugal. Mapterhorn combina elevaciones globales y fuentes regionales más detalladas; AWS Terrain Tiles queda como alternativa. Photon busca direcciones, OSRM calcula rutas y Valhalla calcula isócronas. `docs/PROVEEDORES.md` explica URLs, acceso, atribución y límites.

## 8 Implementación y uso de las herramientas

**Capas.** Cambia visibilidad, estilos, opacidad y encuadre. Hidrografía aparece aquí como imagen WMS. `LayerCard.tsx` y `src/model/` manejan vectores; `raster.ts` define servicios. `App.tsx` y `style.css` organizan paneles. En móvil se pliegan al elegir puntos o zonas y vuelven a abrir al terminar.

**Análisis.** Arrastra un rectángulo o toca dos esquinas. En Libre marca al menos tres puntos y cierra tocando el primero o pulsando «Cerrar y analizar». Mientras esté abierto no se calcula. `MapView.tsx` recoge la selección y `analysis.ts` valida el contorno y calcula.

Cada Feature que intersecta la zona, incluido su borde, cuenta una vez. Un MultiPoint, MultiLineString o MultiPolygon sigue siendo una entidad; dos registros iguales cuentan como dos. Participan vectores visibles con opacidad mayor que cero. Imágenes y edificios del fondo quedan fuera. Si falta una capa visible por cargar, se avisa del resultado parcial.

Se muestran superficie, recuentos, estadísticas numéricas y longitudes y áreas interiores. Se respetan huecos; las áreas superpuestas se suman por entidad. Tocar un borde puede contar con medida interior cero. Se excluyen identificadores y estadísticas sin sentido, aunque la clasificación por nombre de atributo puede requerir adaptación. Las medidas son aproximadas del plano geográfico. Se exportan CSV, JSON y entidades completas en GeoJSON.

**Rutas.** Busca A y B o márcalos en el mapa; puedes intercambiarlos y limpiar. `routing.ts` consulta Photon y OSRM, valida las respuestas y gestiona cancelaciones y errores. El recorrido procede de la red de carreteras. La configuración ofrece coche sin tráfico en tiempo real.

**Isócronas.** Una isócrona delimita el área aproximada alcanzable desde un origen en un tiempo. Elige 5–60 minutos, con 20 por defecto. `serviceArea.ts` consulta `/locate` de Valhalla para comprobar un acceso a carretera a menos de 1 km y después `/isochrone`. `ServiceAreaPanel.tsx` permite calcular, borrar y exportar.

El contorno puede incluir zonas sin acceso directo y no enumera cada calle. El tiempo empieza en el acceso a carretera; la distancia desde el punto elegido se muestra aparte. No calcula batería, ida y vuelta ni tráfico. El servicio puede fallar por carga o cobertura.

**Mapa, relieve y Z.** En «Mapa y relieve» elige Claro, Oscuro, Cartográfico en color, Satélite global u Ortofoto PNOA. `backgroundFor` en `basemaps.ts` hace que PNOA utilice siempre Satélite debajo; cambiar desde Oscuro ya no oscurece Portugal. PNOA tapa el fondo donde aporta imagen y su transparencia deja pasar el fondo. No se detectan automáticamente huecos opacos. Cambiar el fondo conserva capas temáticas.

`TerrainLayer` dibuja una malla de elevaciones Terrarium. `terrainDecoder` convierte colores en alturas: exageración 0 aplana, 1 respeta el modelo y hasta 3 acentúa el relieve. `elevation.ts` prepara una copia sin Z propia para apoyar calles y ríos; las exportaciones conservan los originales. `TerrainExtension` adapta capas a esa superficie con `drape`. Análisis y elección de puntos se realizan en 2D.

La 1.2 usa iluminación neutra en el terreno para evitar oscurecer otra vez la ortofoto y destacar facetas como manchas. Una `TileLayer` independiente permite ver imágenes detalladas sin exigir esa misma resolución al DEM. Claro y Oscuro convierten imágenes OSM a tonos monocromos; Cartográfico conserva color; Satélite y el apoyo de PNOA utilizan VersaTiles sin ese filtro. Liberty se usa en 2D; la textura OSM de Cartográfico en 3D tiene otro aspecto y etiquetas. Las sombras presentes en una fotografía permanecen.

`terrainSource.ts` descarga Mapterhorn hasta zoom 16. Cuando recibe 404 busca un nivel anterior y recorta solo el cuadrante de la zona solicitada. Se evita suavizar los canales RGB porque codifican alturas; suavizarlos como colores inventaría elevaciones. La caché y dos descargas simultáneas limitan la carga. Errores de red, 503 o timeout se muestran, sin fingir terreno. El selector permite volver a AWS, hasta zoom 14. Acercar el mapa no mejora los datos originales.

`satelliteSource.ts` aplica esa recuperación también a las imágenes, que no tienen el mismo detalle en todas las zonas. MapLibre usa el protocolo local `visor-satellite://` en 2D y deck.gl usa el mismo cargador en 3D. Ambos descargan realmente por HTTPS de VersaTiles; el protocolo no necesita un backend y funciona en Pages.

**Edificios.** El control opcional carga teselas vectoriales de OpenFreeMap al acercarse a una ciudad. `MVTLayer` y `MVTLoader` decodifican las huellas; el trabajador MVT se incluye en la compilación para no depender de un CDN. deck.gl extruye polígonos con `render_height` y `render_min_height`, y `offset` los apoya en el terreno. Se omiten alturas inválidas y elementos marcados para ocultarse. Las alturas son orientativas, derivadas de OSM; no se asigna una altura fija a todos. No es fotogrametría; no participan en el recuento GIS. La extensión es experimental y puede deformar edificios grandes en laderas.

## 9 Importar y añadir capas

Importar admite GeoJSON desde archivo o enlace directo, hasta 30 MiB, en EPSG:4326, 4258, 3857 o 31994. `import.ts` distingue archivos, servicios y páginas de visores y separa geometrías mixtas. En Importar se registran WMS 1.1.1 EPSG:3857 y plantillas WMTS Web Mercator compatibles XYZ; los servicios temáticos aparecen en Capas y los mapas regionales en el selector de fondos. Una página HTML no es un archivo geográfico.

Para una capa fija, copia `mis-puntos.geojson` a `public/data/` y añade en `src/config/defaultLayers.ts`:

```typescript
{ id: 'mis-puntos', name: 'Mis puntos', kind: 'point',
  source: 'mis-puntos.geojson', crs: 'EPSG:4326',
  visible: true, stroke: '#245c28', fill: '#4caf50',
  width: 1, radius: 5, opacity: 0.9, sort_order: 3 },
```

Añade la configuración equivalente en `server/database.js`. Una SQLite existente conserva ajustes; cambiar valores iniciales no los sobrescribe. Modifica atributos de la ficha en `src/model/PointLayer.ts`, `LineLayer.ts` o `PolygonLayer.ts`, por ejemplo con `['nombre', 'Nombre']` en `fields`.

Registra servicios fijos en `officialSources` de `src/lib/raster.ts`: URL, capa, atribución, uso y cobertura. Comprueba GetCapabilities, HTTPS, CORS y coordenadas. Pages no puede actuar como proxy. Para cambiar proveedores de rutas o isócronas, modifica `routing.ts` o `serviceArea.ts` y adapta la validación.

Para diseñar un fondo usa Maputnik con un estilo abierto de OpenFreeMap, guarda el JSON en `public/styles/` y regístralo en `styles` de `src/lib/basemaps.ts`; añade su opción en `MapView.tsx`. El JSON cambia colores y etiquetas, no aporta alturas. No hay importador de estilos ni GeoTIFF en la interfaz. `docs/ESTILOS-Y-RELIEVE.md` contiene el ejemplo y explica PMTiles y otras alternativas sin clave.

## 10 Crear otro visor con esta base

Copia el proyecto sin dependencias, compilados ni bases locales. Sustituye GeoJSON, configuraciones estática y local, nombres y atribuciones. Ajusta `App.tsx`, `style.css` y los catálogos de lugares. El encuadre inicial busca `points`: cambia esa referencia si usas otro identificador.

Una herramienta nueva necesita una función en `src/lib/`, un panel en `src/components/` y su conexión en `App.tsx`. Mantén cálculos separados de la interfaz y prueba con datos conocidos.

## 11 Instalación en Windows

Instala Node.js 24 y abre la carpeta en Visual Studio Code. En PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre http://127.0.0.1:5173/. Express utiliza el puerto 3001. `Ctrl+C` detiene el proceso; detén servidores antes de reinstalar para evitar bloqueos de `esbuild.exe`. `npm.cmd run dev:static` prueba el modo sin backend. Para el proyecto local compilado, ejecuta `npm.cmd run build` y después `npm.cmd start`; abre el puerto 3001.

## 12 Despliegue en GitHub Pages

`.github/workflows/pages.yml` instala dependencias, ejecuta pruebas, compila `build:pages` y publica `dist/`. `.env.static` selecciona el modo navegador. `VITE_BASE_PATH` en `vite.config.ts` y `environment.ts` conserva rutas de recursos bajo `/visor-gis/`.

En un repositorio nuevo: créalo, inicia Git, añade archivos, crea un commit, configura el remoto y sube `main`. En uno existente, revisa `git remote -v` y reutilízalo. En Settings → Pages elige GitHub Actions. Revisa la ejecución en Actions y abre la dirección indicada en Settings → Pages. Los comandos completos están en `docs/PAGES.md`.

Para actualizar, ejecuta pruebas y compilación, revisa el diff, crea un commit y haz push. El workflow conserva el registro de Pages más reciente tras un despliegue correcto; no elimina commits ni ejecuciones de Actions. La web solo cambia al completar la publicación.

## 13 Backend y almacenamiento

`server/index.js` arranca Express, `server/app.js` define la API y `server/database.js` gestiona `server/visor.sqlite`. SQLite guarda configuración y referencias; las geometrías originales siguen en GeoJSON.

En Pages, IndexedDB guarda configuración. Las importaciones usan IndexedDB en ambos modos; preferencias de servicios usan localStorage. Rutas, selecciones e isócronas están en memoria y se conservan exportándolas. Borrar datos del sitio elimina lo guardado; otro navegador, origen o dispositivo utiliza su propio almacén. Se mantienen los nombres internos anteriores para conservar preferencias.

Pages no ejecuta Express ni SQLite. Compartir datos requiere un backend externo; no hay cuentas ni sincronización.

## 14 Evolución futura

Una API con PostgreSQL/PostGIS permitiría compartir datos y consultar geometrías en el servidor. Usuarios y permisos controlarían cambios. Para grandes volúmenes convendrían servicios que entreguen solo la zona necesaria. Quedan reducir el tamaño de carga y revisar dependencias.

Se revisó Mapbox Standard, que ofrece edificios, monumentos, terreno e iluminación detallada. Requiere cuenta, token, renderer compatible y revisar costes de uso. La 1.2 implementa OpenFreeMap/deck.gl sin esos requisitos; Mapbox no está integrado. La comparación oficial está en `docs/PROVEEDORES.md`.

## 15 Pruebas y límites

La versión anterior tenía 48 pruebas de geometrías, análisis, API, almacenamiento, importación, rutas, imágenes y alturas. El recuento se contrastó en 45 casos con Shapely/GEOS, todos coincidentes. Las evidencias conservan su fecha y no equivalen a repetir hoy esas peticiones.

Han pasado 68 pruebas automáticas de la 1.2, incluidas edificios, fondo independiente de PNOA y carga del nuevo relieve e imágenes: recorte geográfico, caché, cancelación, límite de descargas, falta de cobertura y errores. El navegador confirmó además los cuatro cuadrantes y sus alturas con el decodificador real. Se han comprobado 15 recursos externos con HTTP 200 y CORS. Se conservan las comprobaciones anteriores de instalación limpia e isócronas. `docs/VERIFICACION.md` distingue pruebas repetidas y evidencias anteriores.

Los servicios necesitan conexión y 3D necesita WebGL; su aspecto depende de GPU, navegador y calidad de datos. La textura puede perder nitidez al acercarse mucho y algunos iconos externos pueden faltar. No se han probado todos los dispositivos físicos ni todas las importaciones posibles. El Word está generado y comprobado estructuralmente, pero no se ha revisado su paginación por falta de LibreOffice en este entorno.

La compilación estática se ha abierto bajo `/visor-gis/`, cargando datos, PNOA, terreno y edificios con sus workers locales.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run build:pages
npm.cmd run check:routing
```

El estado de revisión visual del Word se indica en la guía de verificación. Compilar localmente tampoco demuestra que Pages haya publicado esta versión.
