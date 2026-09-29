# Visor GIS web

Informe resumido de la versión 1.1

Esta memoria explica qué hace el visor, cómo se ha construido y qué archivos permiten ampliarlo. La versión 1.1 se entrega en GitHub. Revisión del 29 de septiembre de 2026.

## 1 Objetivo y utilidad

El visor permite consultar datos geográficos desde el navegador. Por ejemplo, seleccionar una zona de Asturias para contar tramos de carretera, observar una ortofoto de España o estimar hasta dónde llegar en coche en 20 minutos. La organización de paneles y herramientas toma como referencia funcional Global Nature Watch, adaptada a este proyecto.

## 2 Alcance y cambios de versión

Se conserva la base React, TypeScript y deck.gl, los datos originales y el modo local con backend. La 1.0 ya incorporaba capas configurables, selección rectangular y libre, recuentos, rutas, importación y GitHub Pages. La 1.1 añade el área de alcance, cambia la representación del terreno y corrige las capas que flotaban. También conserva el fondo global fuera de la cobertura de una imagen regional y actualiza la documentación.

Es una base funcional para aprender y ampliar un GIS web. No incluye edición completa de geometrías ni trabajo compartido. Al subir la 1.1 a `main`, GitHub Actions inicia el despliegue; su resultado se comprueba en Actions.

## 3 Funcionalidades y cumplimiento

| Función solicitada | Estado real |
| --- | --- |
| Capas y paneles | Visibilidad, orden, estilos, leyenda, opacidad, plegado y anchura ajustable en escritorio. |
| Análisis | Rectángulo y polígono libre cerrado; recuentos, estadísticas, medidas interiores, resaltado y exportación. |
| Rutas | Búsqueda, selección en mapa, intercambio, recorrido real, distancia, duración e indicaciones en coche. |
| Alcance | Contorno aproximado accesible en coche entre 5 y 60 minutos y exportación GeoJSON. |
| Relieve y fuentes | Terreno aproximado con alturas reales, capas adaptadas a su superficie, PNOA e hidrografía WMS. |
| Importación y despliegue | GeoJSON, WMS y WMTS compatibles; modos local y estático. La publicación se comprueba en GitHub Actions. |
| Pendiente | Usuarios, datos compartidos, otros transportes, tráfico y optimización para grandes volúmenes. |

## 4 Tecnologías y motivo de uso

| Tecnología | Función y motivo |
| --- | --- |
| React y TypeScript | React divide la interfaz en componentes; TypeScript comprueba los tipos de capas y respuestas para detectar errores antes de ejecutar. |
| Vite | Sirve el proyecto durante el desarrollo y genera los archivos estáticos de producción. |
| deck.gl | Es el motor principal: dibuja capas, imágenes, rutas, selecciones y terreno con la tarjeta gráfica y permite seleccionar entidades. |
| MapLibre | Controla la cámara, navegación y fondo 2D. MapboxOverlay sincroniza su vista con deck.gl. |
| Turf y proj4 | Turf calcula intersecciones, áreas y distancias; proj4 transforma coordenadas a un sistema común. |
| TerrainExtension y loaders.gl | Adaptan las capas al terreno y convierten teselas de elevación en una malla. El trabajador de terreno se incluye en la compilación. |
| Ant Design y CSS | Aportan controles de formulario y adaptan los paneles al tamaño de pantalla. |
| Node.js y Express | Ejecutan la API local para configuración, datos y búsqueda local. Se utiliza Node 24. |
| SQLite y almacenamiento web | SQLite guarda configuración local; IndexedDB guarda datos del navegador y localStorage preferencias de imágenes. |
| GitHub Actions y Pages | Automatizan pruebas, compilación y publicación de la modalidad estática. |

## 5 Estructura del proyecto

- `src/App.tsx`: conecta los paneles y el estado general.
- `src/components/`: interfaz; `MapView.tsx` conecta el mapa y deck.gl.
- `src/lib/`: análisis, rutas, alcance, coordenadas, imágenes, importación y almacenamiento.
- `src/model/`: PointLayer, LineLayer y PolygonLayer; estilos y atributos por tipo.
- `src/hooks/useLayers.ts`: carga las capas y guarda su configuración.
- `src/config/defaultLayers.ts`: capas iniciales del modo estático.
- `public/data/`: GeoJSON y datos auxiliares estáticos.
- `server/`: API Express, catálogo de lugares y SQLite.
- `tests/`, `docs/` y `.github/workflows/`: pruebas, documentación y publicación.
- `package.json`, `package-lock.json` y `vite.config.ts`: versión, dependencias, comandos y configuración de compilación.

## 6 Flujo de datos

Al abrir el visor, `useLayers.ts` obtiene la configuración desde la API local o el catálogo estático. Después carga los GeoJSON, valida geometrías y normaliza coordenadas mediante `geojson.ts`. Las clases de `src/model/` crean las capas deck.gl y `MapView.tsx` las dibuja.

Al cambiar un control, React actualiza el estado y se guardan las preferencias correspondientes. Al cerrar una selección, `App.tsx` llama a `analyzeLayers` y envía sus resultados a `AnalysisPanel.tsx`. El análisis ocurre en el navegador. Las rutas y el alcance consultan proveedores externos; deck.gl dibuja la geometría que devuelven.

## 7 Procedencia de bibliotecas y datos

Las bibliotecas se instalan desde npm. `package.json` declara rangos y `package-lock.json` fija versiones concretas para reproducir la instalación con `npm.cmd ci`. Una importación de `@deck.gl/layers` usa una biblioteca; una de `../lib/analysis.ts` usa código del proyecto.

Se conservan 9.999 puntos de Chile en EPSG:31994, 6.233 entidades de líneas de Asturias en EPSG:4258 y 399 polígonos de Chile en EPSG:4326. Son los datos heredados; no se acredita una nueva licencia de redistribución. El archivo `example-import.geojson` aporta cuatro entidades ficticias para practicar.

PNOA procede del IGN y la hidrografía de IGN/IDEE. Se solicitan imágenes WMS con atribución visible. OpenFreeMap proporciona los fondos 2D; OpenStreetMap, la textura 3D; Terrain Tiles en AWS, elevaciones Terrarium. Photon busca direcciones, OSRM calcula rutas y Valhalla calcula alcance. Estos servicios dependen de conexión, cobertura y límites de uso.

## 8 Implementación y uso de las herramientas

**Capas y paneles.** En Capas se cambia visibilidad, orden, color, grosor, radio y opacidad. Encuadrar lleva a cada conjunto. `LayerCard.tsx` presenta los controles y `src/model/` produce las capas. `App.tsx` y `style.css` permiten plegar y ajustar el panel en escritorio y mostrarlo abajo en pantallas pequeñas. Al seleccionar zonas o puntos en móvil, se pliega y vuelve a abrir al terminar.

**Rectángulo y modo libre.** En Análisis se arrastra un rectángulo o se tocan dos esquinas. En Libre se marcan al menos tres puntos y se cierra tocando el primero o pulsando Cerrar y analizar. Mientras esté abierto no se calcula. Se pueden deshacer puntos, cancelar y repetir. `MapView.tsx` recoge las interacciones y `analysis.ts` rechaza contornos cruzados, repetidos, alineados o inválidos.

Se cuenta la intersección de la geometría real con la selección, incluido su borde. Cada Feature cuenta una vez, aunque sea MultiPoint, MultiLineString o MultiPolygon. Dos registros iguales siguen contando como dos; no se deduplican entre capas. Solo participan vectores visibles con opacidad mayor que cero. Si falta una capa visible por cargar, se avisa de resultado parcial. Las imágenes WMS/WMTS quedan fuera.

Turf verifica intersecciones y recorta polígonos. Para las líneas se recortan segmentos con Liang–Barsky en rectángulos; en selección libre se separan en los cruces del contorno y se miden los intervalos interiores. Tocar un borde puede contar una entidad y aportar longitud o área cero. Se respetan huecos y se suman las áreas de entidades superpuestas. Son medidas geográficas aproximadas, no distancias sobre la pendiente del terreno.

Se muestran km² o hectáreas, recuentos por capa y tipo, y mínimo, máximo, suma y media de atributos numéricos válidos. Se excluyen códigos e identificadores; no se suman porcentajes, pendientes o cotas, ni se calcula media aritmética de orientaciones. La clasificación por nombre de campo puede necesitar adaptación. Los atributos corresponden a la entidad completa. Se exportan JSON, CSV y las entidades completas en GeoJSON; el resaltado usa las entidades contadas.

**Rutas.** `RoutePanel.tsx` permite buscar A y B, elegirlos en el mapa, intercambiarlos y limpiar. `routing.ts` consulta Photon y OSRM con perfil de coche y pasos de navegación. Valida respuestas, usa caché y gestiona cancelaciones, tiempos de espera y falta de acceso. La línea procede del servicio de carreteras, nunca de unir directamente A y B. No hay tráfico, bicicleta o caminata en la configuración actual.

**Área de alcance.** En Alcance se eligen un origen y entre 5 y 60 minutos, con 20 por defecto. `ServiceAreaPanel.tsx` reutiliza el buscador de rutas. `serviceArea.ts` consulta primero `/locate` de Valhalla para comprobar una carretera a menos de 1 km, y después `/isochrone` con `costing: 'auto'`. Valida el polígono y el tiempo recibido; `MapView.tsx` lo dibuja y encuadra. Se puede borrar o exportar GeoJSON.

El contorno aproxima lugares accesibles saliendo del origen. Puede englobar zonas sin acceso directo y no enumera todas las calles. Se muestra la distancia al acceso a carretera; ese tramo inicial no se incluye en el tiempo. No calcula batería, autonomía eléctrica, ida y vuelta o tráfico. Valhalla/FOSSGIS es un servicio público de demostración para uso moderado.

**Relieve y eje Z.** Antes, el terreno y las alturas propias de las capas podían verse separados. Ahora `elevation.ts` crea una copia de dibujo con longitud y latitud; los datos originales conservan su Z. `MapView.tsx` dibuja una única malla `TerrainLayer` y adapta vectores, imágenes, rutas y selecciones mediante `TerrainExtension` en modo `drape`.

Terrarium codifica las alturas en los colores de las teselas. `terrainDecoder` los convierte a elevación y aplica exageración: 0 aplana, 1 mantiene la altura del modelo y hasta 3 la acentúa. Al alternar 2D y 3D se recrean las capas con identificadores distintos para inicializar o retirar el efecto de terreno. MapLibre controla la cámara y deck.gl dibuja el relieve. No representa edificios ni puentes elevados. La extensión es experimental; análisis y elección de puntos se realizan en 2D.

**Fondos regionales.** Mapa base regional sitúa una imagen debajo de las capas temáticas y apaga otras imágenes base regionales. El fondo global permanece: PNOA sustituye visualmente España y Portugal sigue visible. `raster.ts` solicita PNG transparente; `MapView.tsx` mantiene el fondo 2D o la textura 3D. Al 100 % los píxeles opacos tapan el fondo; al bajar la opacidad se mezclan. Se respeta la extensión configurada y la transparencia del proveedor; no se detectan automáticamente huecos pintados opacos. Sin fondo desactiva expresamente la cartografía de apoyo.

## 9 Importar y añadir capas

Importar admite GeoJSON desde archivo o enlace directo, hasta 30 MiB, en EPSG:4326, 4258, 3857 o 31994. `import.ts` distingue archivos, servicios y páginas de visores, valida contenido y separa geometrías mixtas por tipo. `geojson.ts` comprueba coordenadas y anillos. WMS y WMTS se añaden en Fuentes: WMS 1.1.1 EPSG:3857 o plantilla WMTS Web Mercator equivalente a XYZ. HTML no es GeoJSON; otros formatos requieren conversión.

Para una capa fija, copia `mis-puntos.geojson` a `public/data/` y añade a `src/config/defaultLayers.ts` una entrada como esta, para puntos en longitud y latitud:

```typescript
{ id: 'mis-puntos', name: 'Mis puntos', kind: 'point',
  source: 'mis-puntos.geojson', crs: 'EPSG:4326',
  visible: true, stroke: '#245c28', fill: '#4caf50',
  width: 1, radius: 5, opacity: 0.9, sort_order: 3 },
```

Añade también la configuración inicial equivalente en `server/database.js` para el modo local. Una SQLite existente conserva ajustes: cambiar valores iniciales de una capa existente no los sobrescribe. Los atributos se ajustan en `src/model/PointLayer.ts`, `LineLayer.ts` o `PolygonLayer.ts`; por ejemplo, añade `['nombre', 'Nombre']` a `fields`.

Las fuentes fijas se registran en `officialSources` dentro de `src/lib/raster.ts`: URL, capa WMS o plantilla, atribución, visibilidad, opacidad, uso y límites. Comprueba GetCapabilities, HTTPS, CORS y coordenadas. Si el navegador bloquea una URL, revisa el servicio o importa un archivo descargado; Pages no puede actuar como proxy de servidor.

## 10 Crear otro visor con esta base

Copia el proyecto sin dependencias, compilados ni bases locales. Sustituye GeoJSON, configuraciones estática y local, nombres y atribuciones. Cambia los textos de `App.tsx` y estilos de `style.css`. Revisa `LocationSearch.tsx`, `server/places.json` y el catálogo estático; `scripts/update-places.mjs` actualiza este último. El encuadre inicial de `App.tsx` busca `points`: adáptalo si cambias ese identificador.

Mantén separados cálculos y paneles. Una herramienta nueva necesita una función en `src/lib/`, un panel en `src/components/` y su conexión en `App.tsx`. Prueba primero con datos conocidos.

## 11 Instalación en Windows

Instala Node.js 24 y abre la carpeta en Visual Studio Code. En PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre http://127.0.0.1:5173/. Express usa el puerto 3001. Ctrl+C detiene el proceso; detén servidores antes de reinstalar. `npm.cmd run dev:static` prueba el modo sin backend. Para servir el proyecto local compilado, ejecuta `npm.cmd run build` y después `npm.cmd start`; abre el puerto 3001.

## 12 Despliegue en GitHub Pages

`.github/workflows/pages.yml` instala dependencias, ejecuta pruebas, compila con `build:pages` y publica `dist/`. `.env.static` selecciona almacenamiento en navegador. `vite.config.ts` usa `VITE_BASE_PATH`; `environment.ts` aplica esa base a los recursos, incluso bajo `/visor-gis/`.

Para un repositorio nuevo, créalo en GitHub y ejecuta git init, git add, git commit, git branch, git remote add y git push. Si ya existe, revisa `git remote -v` y reutiliza el remoto. `docs/PAGES.md` contiene todos los comandos y la configuración de autor.

En Settings → Pages elige GitHub Actions. Al subir a main o pulsar Run workflow, revisa pruebas, compilación y despliegue en Actions. La dirección aparece en Settings → Pages y en el workflow; para este repositorio es https://alexing-uni.github.io/visor-gis/. Esto no implica que la 1.1 esté publicada.

Para actualizar, ejecuta las pruebas y compilación, revisa `git diff`, crea un commit y haz push. Tras publicar correctamente, el workflow conserva el registro nuevo de Pages y elimina los anteriores de ese entorno. No borra commits ni ejecuciones de Actions; durante el despliegue pueden aparecer varios registros. Este envío a `main` activa el workflow; confirma su resultado en GitHub Actions.

## 13 Backend y almacenamiento

`server/index.js` arranca Express y abre `server/visor.sqlite`; `server/app.js` define la API y `server/database.js` gestiona la tabla de capas. SQLite guarda nombres, estilos, orden, visibilidad y referencias. Las geometrías originales siguen en GeoJSON, no en una base espacial.

En Pages, IndexedDB guarda la configuración. Las importaciones usan IndexedDB en ambos modos; las preferencias WMS/WMTS usan localStorage. Rutas, selecciones y alcance viven en memoria: hay que exportarlos para conservarlos. Borrar los datos del sitio elimina lo guardado; otro origen web o dispositivo usa otro almacenamiento.

Se mantiene el nombre interno `visor-gis-v04` de IndexedDB y las claves existentes para no perder preferencias. Ese nombre identifica el almacén, no la versión visible. Pages no ejecuta Express ni SQLite. Compartir datos requiere backend externo; no hay cuentas ni sincronización.

## 14 Evolución futura

Una API con PostgreSQL/PostGIS permitiría compartir datos y consultar geometrías en el servidor. Usuarios y permisos controlarían quién consulta o modifica. Para grandes volúmenes convendrían servicios geográficos y teselas vectoriales que entreguen solo la zona necesaria. También queda optimizar la carga inicial y revisar dependencias. Son propuestas, no funciones de la 1.1.

## 15 Pruebas y límites

La batería actual contiene 48 pruebas de análisis, geometrías, API, almacenamiento, importación, rutas, imágenes, alturas y alcance. Incluye persistencia y operaciones que se revierten si fallan. El recuento se contrastó previamente en 45 casos con Shapely/GEOS, todos coincidentes; `docs/count-audit.json` conserva los resultados. Esto respalda esos casos, no garantiza cualquier GeoJSON.

Se verificaron compilaciones local y estática, rutas reales y fuentes oficiales. En la ampliación se probó un alcance real de 20 minutos desde Oviedo y se rechazó un origen en el océano. Se revisaron terreno, exageración cero, retorno a 2D y España con PNOA conservando Portugal en ambas vistas. Se han probado ventanas de escritorio, tableta y móvil, pero no dispositivos táctiles físicos ni todas las tarjetas gráficas.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run build:pages
npm.cmd run check:routing
```

Los servicios pueden fallar por cuota, conexión o cambios del proveedor. No se ha probado cualquier archivo grande; GeoJSON completos consumen memoria. La auditoría previa dejó 11 avisos transitivos de dependencias y persiste el aviso de tamaño de compilación. `docs/VERIFICACION.md` distingue evidencias anteriores y actuales e indica el estado de revisión visual del Word.
