# Estilos de mapa y relieve: alternativas sin clave

Investigación del 2 de octubre de 2026. Esta guía explica los fondos y el 3D de la versión 1.2 y cómo personalizarlos. Las pruebas finales de la aplicación se recogen en [VERIFICACION.md](VERIFICACION.md).

## 1. Cuatro cosas distintas

- **Estilo:** un JSON que indica colores, etiquetas, símbolos y qué datos dibujar. No contiene por sí solo un mapa completo.
- **Teselas:** fragmentos de datos vectoriales o imágenes que se cargan al mover el mapa.
- **DEM:** modelo digital de elevación; aporta alturas para crear montañas y valles.
- **Edificios:** huellas y alturas que permiten levantar volúmenes. No son fotografías ni modelos detallados de fachadas.

MapLibre presenta el fondo y controla la cámara. deck.gl sigue dibujando las capas GIS, la selección, las rutas, las isócronas, el terreno y los edificios. Cambiar un estilo no sustituye esos cálculos.

## 2. Qué se ha elegido

**Claro** y **Oscuro** mantienen los estilos de OpenFreeMap. **Cartográfico** añade Liberty, con colores, calles y nombres. **Satélite** utiliza las imágenes abiertas de VersaTiles.

**Ortofoto PNOA** utiliza siempre el fondo Satélite fuera de su cobertura, aunque antes estuviera seleccionado Oscuro. PNOA se dibuja encima en España. Es una sustitución por cobertura: Portugal y otras zonas siguen teniendo fondo.

VersaTiles tiene niveles detallados solo en algunas regiones. `src/lib/satelliteSource.ts` busca y recorta la zona correspondiente de una imagen de menor resolución si falta un nivel. El protocolo local `visor-satellite://` permite utilizar ese mismo cargador en MapLibre 2D y en deck.gl 3D, sin servidor propio. No oculta errores de conexión ni fabrica detalle.

El relieve utiliza **Mapterhorn** como proveedor principal y conserva **AWS Terrain Tiles** como alternativa. Ambos emplean la codificación Terrarium. Se solicitan alturas hasta zoom 16 en Mapterhorn; si falta detalle en una zona se reutiliza una tesela de un nivel anterior. Acercar el mapa no garantiza que existan datos nuevos.

Los fondos cartográficos vectoriales se usan en 2D. En 3D, deck.gl coloca una textura sobre su malla: cartografía OSM para los temas cartográficos, e imágenes VersaTiles y PNOA para Satélite y Ortofoto. Importar un JSON de estilo no lo convierte automáticamente en una textura de terreno.

## 3. Opciones investigadas

| Proyecto | Qué ofrece | Condiciones principales |
| --- | --- | --- |
| [OpenFreeMap](https://openfreemap.org/quick_start/) | Liberty, Bright, Fiord, Positron y Dark; datos vectoriales OSM/OpenMapTiles. | Instancia pública sin cuenta ni clave. Atribución obligatoria; sin SLA. [Licencias de estilos y recursos](https://github.com/hyperknot/openfreemap-styles/blob/main/LICENSE.md). |
| [VersaTiles](https://versatiles.org/) | Estilos Natural, Muted, Gray y otros; imágenes y elevación abiertas. | Sin clave y autohospedable. Hay que mantener las [atribuciones de los datos](https://versatiles.org/sources/); el servidor público es una dependencia externa. |
| [Mapterhorn](https://mapterhorn.com/data-access/) | DEM global y datos más detallados en algunas regiones. | Sin clave en su endpoint público; fuentes con distintas licencias. Conservar [atribución y procedencia](https://mapterhorn.com/attribution/). |
| [Maptoolkit Community](https://www.maptoolkit.org/3d) | Summer, Hiking, Street y otros; variantes `-3d` con terreno. | Acceso sin clave para usos permitidos. Exige logo de al menos 24 px y copyright siempre visibles. Restricciones para grandes empresas, descargas masivas y redistribución del servicio; uso razonable y sin SLA. [Condiciones](https://www.maptoolkit.org/). |
| [Protomaps / PMTiles](https://docs.protomaps.com/basemaps/maplibre) | Datos y estilos para alojamiento propio; archivos consultables desde el navegador. | Sin API comercial si alojas tus archivos. Necesita almacenamiento con HTTP Range y CORS, y atribución OSM. Conviene extraer una región; no usar las descargas del proyecto como servidor de producción. [Descargas](https://docs.protomaps.com/basemaps/downloads). |
| [Maputnik](https://maputnik.github.io/) | Editor visual abierto para diseñar un estilo JSON. | No exige registro. Los datos, fuentes e iconos del estilo deben seguir siendo accesibles y tener permiso de uso. |

[Mapbox Standard](https://docs.mapbox.com/map-styles/guides/standard-styles/) es otra opción, con cuenta, token y un motor compatible. No se ha incorporado. Un estilo propietario con URLs `mapbox://` no pasa a ser libre por copiar su JSON. Los estilos abiertos de OpenFreeMap sí permiten una apariencia similar con recursos accesibles sin token.

## 4. Procedencia, fechas y precisión

VersaTiles combina imágenes globales de **Sentinel-2**, bajo CC BY 4.0, y ortofotos disponibles, incluidas las portuguesas de **Direção-Geral do Território**, también CC BY 4.0. PNOA procede del **IGN/Sistema Cartográfico Nacional**. Consulta las [fuentes de VersaTiles](https://versatiles.org/sources/) y la [política de datos del IGN](https://www.ign.es/web/ign/portal/politica-datos). El mapa debe conservar sus atribuciones visibles.

Las capturas no tienen necesariamente la misma fecha, color ni resolución. Puede verse una transición en la frontera o entre vuelos. No son imágenes en tiempo real. La cobertura detallada de Portugal tampoco implica ortofoto detallada en todo el mundo.

Mapterhorn mezcla distintas fuentes de elevación. Su [catálogo de atribuciones](https://download.mapterhorn.com/attribution.json) incluye para España MDT02 de la segunda cobertura, 2015–2021, con malla de 2 m, y fuentes de 0,5 m de la tercera cobertura, 2022–2025. Para el conjunto global utiliza, entre otras fuentes, Copernicus GLO-30. Estas cifras corresponden a los datos de origen: la precisión visible depende del zoom, del procesamiento y de la zona.

La ortofoto aporta color y el DEM aporta altura; pueden proceder de años diferentes. Los edificios actuales son volúmenes extruidos con alturas disponibles o estimadas en los datos OSM. Este visor no ofrece fotogrametría ni una réplica exacta de cualquier ciudad.

## 5. Crear un estilo propio con Maputnik

1. Abre [Liberty en Maputnik](https://maplibre.org/maputnik/?style=https://tiles.openfreemap.org/styles/liberty).
2. Modifica colores, nombres o visibilidad de elementos. Conserva las atribuciones.
3. Exporta el JSON y guárdalo como `public/styles/mi-estilo.json` en el proyecto.
4. Añade una entrada al catálogo `styles` de `src/lib/basemaps.ts`:

```ts
'Mi estilo': `${import.meta.env.BASE_URL}styles/mi-estilo.json`,
```

5. Añade la opción al selector de fondos de `src/components/MapView.tsx` y comprueba el mapa en local y en Pages. `BASE_URL` permite encontrar el JSON cuando Pages publica bajo `/visor-gis/`.

El archivo debe usar fuentes compatibles con su esquema. Por ejemplo, un estilo OpenMapTiles espera nombres de capas como `water` o `transportation`; no basta con cambiar su URL por teselas de otro esquema. Revisa también `glyphs`, `sprite`, las URLs relativas y CORS. Alojar el JSON no aloja automáticamente esos recursos.

**Actualmente no hay un importador de estilos JSON en la interfaz.** Importar GeoJSON añade entidades GIS; guardar y registrar un estilo es una modificación del proyecto. Un JSON con capas exclusivas de Mapbox, `imports` propietarios o credenciales requerirá adaptación.

## 6. Añadir otro modelo de relieve

`src/components/MapView.tsx` conecta la fuente de alturas con `TerrainLayer`; `src/lib/elevation.ts` contiene el decodificador. `src/lib/terrainSource.ts` implementa `createTerrainFetch`: carga Mapterhorn, limita peticiones simultáneas, conserva una caché y recorta la parte correcta de una tesela anterior cuando falta detalle. Utiliza `@loaders.gl/core` 4.5.2 para cargar y decodificar el DEM con el trabajador empaquetado.

Al registrar otro proveedor, revisa la URL, tamaño, zoom máximo, tratamiento de errores y atribución en esos archivos. El fondo y las alturas son independientes: cambiar Satélite por Cartográfico no cambia el DEM.

Para un proveedor Terrarium se utiliza:

```ts
{ rScaler: 256, gScaler: 1, bScaler: 1 / 256, offset: -32768 }
```

Un DEM GeoTIFF descargado no se puede introducir directamente con el importador GeoJSON. Hay que prepararlo fuera del visor: comprobar proyección y unidades verticales, corregir datos ausentes, generar una pirámide de teselas RGB en Web Mercator y publicarla con CORS. QGIS/GDAL y herramientas de generación de teselas permiten realizar ese trabajo. Después se registra la URL y su decodificador en el código. Terrain-RGB de Mapbox y Terrarium utilizan fórmulas distintas.

## 7. Qué se verificó en la investigación

Se consultaron las páginas de los propios proyectos. Las peticiones de lectura devolvieron HTTP 200 y CORS `*` para Liberty, Bright y Fiord, los sprites y un bloque de fuentes de Liberty, el TileJSON de Mapterhorn y teselas de Oviedo en zoom 12, 14 y 16. También respondieron correctamente el estilo Satélite de VersaTiles y dos imágenes de Lisboa en zoom 10 y 15. Se confirmó el tamaño de 512 × 512 de una imagen de Lisboa y una tesela DEM.

Estas comprobaciones confirman acceso a esos recursos en esa fecha. No garantizan disponibilidad futura ni sustituyen las pruebas de dibujo, selección, almacenamiento y rendimiento de la aplicación.
