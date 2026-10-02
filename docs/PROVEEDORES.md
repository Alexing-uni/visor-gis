# APIs, datos y proveedores de la versión 1.2

Revisión documental: 2 de octubre de 2026. Una API es una dirección que permite pedir datos a otro servicio. Una biblioteca es código instalado en el proyecto. Por ejemplo, deck.gl dibuja el mapa; OSRM devuelve una ruta. Son funciones distintas.

## Qué servicio hace cada cosa

| Función | Proveedor y dirección utilizada | Acceso, datos y condiciones |
| --- | --- | --- |
| Fondos 2D Claro, Oscuro y Cartográfico | [OpenFreeMap](https://openfreemap.org/), estilos `https://tiles.openfreemap.org/styles/positron`, `/dark` y `/liberty` | Sin cuenta ni token. Datos OSM, esquema OpenMapTiles; conservar atribución OSM/OpenMapTiles. No ofrece SLA. |
| Fondo cartográfico 3D | [OpenStreetMap](https://www.openstreetmap.org/copyright), `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Sin token. Datos ODbL y atribución visible. El servidor exige cumplir su política de teselas; no es un servicio de descarga masiva u offline. |
| Satélite y fondo exterior de PNOA | [VersaTiles](https://versatiles.org/), `https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}` | Imágenes WebP de 512 px, sin token. Combina fuentes abiertas, como Sentinel-2 global y ortofoto DGT en Portugal. Conservar enlace a [atribuciones](https://versatiles.org/sources/). Fechas y resolución variables. |
| Altura del terreno principal | [Mapterhorn](https://mapterhorn.com/data-access/), `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp` | DEM Terrarium de 512 px, sin token. Fuentes globales y regionales; conservar [atribución](https://mapterhorn.com/attribution/). Resolución variable; el visor usa un nivel anterior cuando falta detalle. |
| Altura del terreno alternativa | [Terrain Tiles / AWS](https://registry.opendata.aws/terrain-tiles/), `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` | Acceso público sin token. DEM global compuesto de varias fuentes; licencias y atribuciones dependen de la región. Resolución variable. |
| Ortofoto de España | [PNOA/IGN](https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&REQUEST=GetCapabilities), capa `OI.OrthoimageCoverage` | WMS público. Conservar la atribución PNOA/IGN del servicio y comprobar su cobertura. Licencia IGN compatible con CC BY 4.0. |
| Ríos y red hidrográfica | [IGN/IDEE](https://servicios.idee.es/wms-inspire/hidrografia?SERVICE=WMS&REQUEST=GetCapabilities), capa `HY.Network` | WMS público. Conservar atribución IGN/Sistema Cartográfico Nacional y condiciones de cada conjunto. Aporta imagen, no entidades consultables para el análisis. |
| Edificios de fondo | [OpenFreeMap TileJSON](https://tiles.openfreemap.org/planet), capa vectorial `building` | Sin token. Datos OSM/OpenMapTiles. Alturas orientativas; cobertura y detalle variables. No se incorporan al recuento GIS. |
| Buscar direcciones | [Photon de komoot](https://github.com/komoot/photon), `https://photon.komoot.io/api/` | Demo pública sin token. Datos OSM; software Apache 2.0. Uso razonable; puede limitar o bloquear peticiones y no garantiza disponibilidad. |
| Calcular ruta en coche | [OSRM](https://project-osrm.org/docs/), `https://router.project-osrm.org/route/v1/driving/` | Demo pública sin token. Datos OSM y atribución OSRM. Uso moderado, sin disponibilidad garantizada; no hay tráfico en tiempo real en esta configuración. |
| Calcular isócrona | [Valhalla/FOSSGIS](https://valhalla.openstreetmap.de/), `https://valhalla1.openstreetmap.de/locate` y `/isochrone` | Servicio público sin token. Datos OSM; condiciones de FOSSGIS. Solo se ofrece coche en el visor, sin tráfico en tiempo real. |

El acceso público a un servidor y la licencia del código son cosas distintas: instalar un motor abierto no significa disponer de capacidad ilimitada en su servidor de demostración. Para muchas visitas conviene contratar un servicio adecuado o alojar una instancia propia.

## Dónde se configuran

- `src/lib/routing.ts`: URLs de Photon y OSRM, validación e indicaciones.
- `src/lib/serviceArea.ts`: Valhalla, acceso a carretera y petición de isócrona.
- `src/lib/raster.ts`: URL, nombre técnico de capa, atribución y cobertura de PNOA e hidrografía.
- `src/components/MapView.tsx`: selector de fondos, teselas de elevación, textura y edificios.
- `src/lib/basemaps.ts`: catálogo de estilos y fondo Satélite que siempre acompaña a PNOA.
- `src/lib/terrainSource.ts`: carga y caché de Mapterhorn; recorte del nivel anterior si falta una tesela de detalle.
- `src/lib/satelliteSource.ts`: descarga imágenes de VersaTiles y recupera un nivel anterior cuando falta cobertura; el protocolo local `visor-satellite://` comparte este cargador entre MapLibre 2D y deck.gl 3D.
- `src/lib/buildings.ts`: validación de alturas y preparación de geometrías.
- `src/lib/basemapTone.ts`: conversión de la textura 3D a claro u oscuro antes de componer otras imágenes.

Al cambiar proveedor, adapta también el formato de su respuesta. Sustituir solamente la URL puede producir datos incompatibles.

## Cómo se construye el 3D

El modelo Terrarium codifica altura con los colores RGB. `TerrainLayer` lo transforma en una malla de montañas y valles. Se solicita Mapterhorn hasta zoom 16 y AWS hasta zoom 14. Si no existe una tesela de detalle en Mapterhorn, se recorta su zona de un nivel anterior, conservando la ubicación. Esto aporta los datos disponibles, sin crear precisión nueva.

Una `TileLayer` independiente carga la textura, hasta zoom 19. Claro y Oscuro usan cartografía OSM con tonos monocromos; Cartográfico usa OSM en color. Su dibujo 3D difiere de Liberty en 2D. Satélite y el fondo exterior de PNOA usan imágenes VersaTiles; PNOA cubre España por encima y conserva su color. Pasar de Oscuro a Ortofoto ya no hereda el tema oscuro.

VersaTiles declara zoom 19, pero no todas las regiones disponen de imágenes en todos esos niveles. Ante un 404, el cargador recorta su zona de una imagen anterior en ambos modos. Los errores de servicio y de conexión siguen visibles. No aumenta la resolución original.

Las imágenes y capas planas usan `TerrainExtension` con `drape`; los edificios usan `offset` para conservar volumen. La [extensión de terreno](https://deck.gl/docs/api-reference/extensions/terrain-extension) es experimental. `@loaders.gl/core` 4.5.2 carga y decodifica el DEM; los decodificadores y trabajadores Terrain/MVT se empaquetan con el proyecto. No necesitan una clave de proveedor.

Los edificios son huellas extruidas, no modelos fotogramétricos. El [esquema OpenMapTiles](https://openmaptiles.org/docs/schema/) define `render_height` y `render_min_height` como alturas aproximadas obtenidas de alturas y plantas del edificio. La aplicación no puede identificar con certeza el método que produjo cada valor. Omite alturas inválidas y elementos `hide_3d`, en vez de asignarles una altura fija inventada.

La iluminación neutra de la malla evita añadir un oscurecimiento direccional sobre una ortofoto que ya contiene sombras de su captura. No elimina esas sombras originales. Una pendiente puede deformar la cubierta de un edificio grande y el resultado depende de la resolución del DEM. Las imágenes y elevaciones pueden proceder de años distintos.

La textura intermedia de deck.gl puede conservar una resolución menor al acercarse mucho; solicitar imágenes más detalladas no convierte el modelo de alturas en uno de mayor precisión. Los iconos disponibles también dependen del estilo externo.

## Qué se revisó de Mapbox

[Mapbox Standard](https://docs.mapbox.com/map-styles/guides/standard-styles/) ofrece edificios, modelos de monumentos, árboles, iluminación y terreno. También publica [un ejemplo de DEM 3D](https://docs.mapbox.com/mapbox-gl-js/example/add-terrain/) y [otro de edificios extruidos](https://docs.mapbox.com/mapbox-gl-js/example/3d-buildings/). Su detalle varía por lugar; no garantiza una reproducción fotogramétrica de cualquier ciudad.

Standard requiere cuenta, token y un renderer Mapbox compatible. No funciona como intercambio directo de URL del estilo MapLibre actual. Sus [costes](https://www.mapbox.com/pricing/) dependen del producto y uso y deben revisarse antes de activarlo. **La versión 1.2 no consume APIs de Mapbox.** El nombre `MapboxOverlay` corresponde al adaptador de deck.gl, que también se utiliza con MapLibre.

Sí existen alternativas sin clave. Se han elegido Liberty, VersaTiles y Mapterhorn; también se revisaron Maptoolkit Community, Protomaps y el editor Maputnik. La [guía de estilos y relieve](ESTILOS-Y-RELIEVE.md) compara sus condiciones y explica cómo registrar un JSON propio. El importador de la interfaz sigue siendo para datos y servicios; no importa estilos de Mapbox o MapLibre.

## Qué datos salen del navegador

Photon recibe el texto de búsqueda. OSRM recibe origen y destino; Valhalla recibe origen y tiempo. Los servidores de teselas reciben peticiones correspondientes a la zona visible. Los GeoJSON importados y los cálculos de análisis permanecen en el navegador; no se envían a estos servicios para contar entidades.

## Referencias y comprobaciones

- [Política de teselas de OSM](https://operations.osmfoundation.org/policies/tiles/).
- [Atribuciones del terreno por región](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
- [Fuentes de elevación Mapterhorn](https://download.mapterhorn.com/attribution.json).
- [Fuentes de imágenes VersaTiles](https://versatiles.org/sources/).
- [Política de datos del IGN](https://www.ign.es/web/ign/portal/politica-datos).
- [Condiciones del servidor OSRM](https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy).
- [Condiciones de FOSSGIS](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/).
- [API de Valhalla](https://valhalla.github.io/valhalla/api/).

Se consultó documentación oficial de los proyectos. La investigación confirmó acceso HTTP y CORS a estilos y recursos OpenFreeMap, teselas Mapterhorn de Oviedo e imágenes VersaTiles de Lisboa; el detalle está en [Estilos y relieve](ESTILOS-Y-RELIEVE.md). Las páginas de condiciones FOSSGIS bloquearon la lectura automatizada; no se ha deducido una cuota numérica. Las pruebas de la aplicación y los servicios se detallan en [Verificación](VERIFICACION.md), con sus fechas.
