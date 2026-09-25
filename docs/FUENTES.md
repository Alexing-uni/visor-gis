# Fondos, servicios oficiales y relieve

## Fuentes utilizadas

| Fuente | Función | Archivo de configuración | Atribución y procedencia |
| --- | --- | --- | --- |
| OpenFreeMap Positron / Dark | Fondo mundial claro u oscuro | `src/components/MapView.tsx`, objeto `styles` | OpenFreeMap, OpenMapTiles y colaboradores de OpenStreetMap; la atribución del TileJSON se incorpora al control de MapLibre |
| IGN PNOA máxima actualidad | Ortofotografía de España como imagen WMS | `src/lib/raster.ts`, entrada `pnoa` | PNOA / Instituto Geográfico Nacional / Sistema Cartográfico Nacional; el GetCapabilities declara CC BY 4.0 scne.es |
| IGN/IDEE Hidrografía | Red hidrográfica oficial como imagen WMS | `src/lib/raster.ts`, entrada `hydro` | IGN / Sistema Cartográfico Nacional / IGR Hidrografía; el GetCapabilities declara CC BY 4.0 scne.es |
| Terrain Tiles / Terrarium | Modelo global de elevación para el terreno de MapLibre | `src/components/MapView.tsx`, función `applyTerrain` | Mapzen, distribución AWS Open Data y créditos de los productores originales según cada región |
| Tres GeoJSON iniciales | Datos vectoriales de trabajo y análisis | `public/data/` y configuración inicial del almacenamiento | Archivos entregados con el proyecto; inventario, CRS y huellas en `docs/DATOS.md`. No se atribuyen automáticamente al IGN |

La [instancia pública OpenFreeMap](https://openfreemap.org/) permite el uso sin clave y explica la atribución; su [guía de integración](https://openfreemap.org/quick_start/) proporciona los estilos de MapLibre. No ofrece un acuerdo de disponibilidad garantizada. Se ha sustituido CARTO: sus [condiciones de septiembre de 2026](https://www.carto.com/legal/basemap-terms/) y [página de claves](https://www.carto.com/basemaps/apikey/) exigen una clave del responsable del proyecto. El visor entregado usa OpenFreeMap y no necesita esa clave.

## Servicios oficiales y nombres de capa

PNOA:

```text
https://www.ign.es/wms-inspire/pnoa-ma
Capa: OI.OrthoimageCoverage
```

Hidrografía:

```text
https://servicios.idee.es/wms-inspire/hidrografia
Capa: HY.Network
```

La descripción técnica se consulta añadiendo `?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.1.1` al servicio. El resultado es XML; no es una capa GeoJSON. Los metadatos recuperados describen, respectivamente, las ortoimágenes de España y la hidrografía de aguas físicas y del modelo de red. Consulta sus nombres técnicos, estilos, cobertura y condiciones antes de registrar otra capa.

Ambas capas están desactivadas inicialmente y se activan desde el panel de fuentes oficiales. El botón de encuadre se centra en la península y Baleares; las capas oficiales españolas no cubren los datos iniciales de Chile. En una zona fuera de cobertura una imagen transparente es un resultado esperable.

`tileUrl` construye peticiones **WMS 1.1.1**, en **EPSG:3857**, con PNG transparente y 256 × 256 píxeles. La caja de longitud/latitud se convierte a metros Mercator antes de enviar `BBOX`; se usa `SRS`, de acuerdo con esa versión del servicio. Así se evita mezclar el orden de ejes de algunas peticiones WMS 1.3.0. deck.gl carga las imágenes mediante `TileLayer` y `BitmapLayer`, y las coloca sobre el fondo de MapLibre.

Una imagen WMS permite ver los ríos o una ortofoto, pero **no incorpora entidades vectoriales para el análisis**. Esta aplicación no ejecuta consultas GetFeatureInfo ni descarga los elementos del servicio. El recuento y las estadísticas del rectángulo se limitan a las colecciones vectoriales cargadas. Para analizar ríos oficiales hace falta obtener su conjunto vectorial mediante una descarga o servicio apropiado y cargarlo en el visor.

## Relieve y atribución

El modelo Terrarium se obtiene de [Terrain Tiles en AWS Open Data](https://registry.opendata.aws/terrain-tiles/):

```text
https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
```

Sus canales de color codifican alturas, y MapLibre los interpreta como `raster-dem` con `encoding: 'terrarium'`. La vista 3D cambia la inclinación de cámara; el interruptor de terreno activa la elevación, y el control de exageración cambia su apariencia. Son controles diferentes. La exageración no modifica las coordenadas ni los cálculos de superficie. Las capas deck.gl conservan su propia geometría y no se ajustan automáticamente al terreno de MapLibre; el análisis y la selección se realizan en 2D.

No hay una resolución o fecha uniforme para todo el mundo. Los [créditos de Terrain Tiles](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) identifican las fuentes regionales: Copernicus EU-DEM para Europa; USGS para SRTM, GMTED2010 y 3DEP; NOAA para ETOPO1; y otras agencias en Australia, Austria, Canadá, México, Nueva Zelanda, Noruega, Reino Unido y el Ártico. Se debe conservar el enlace a estas fuentes junto al crédito de Mapzen/AWS y las atribuciones del mapa. No se presenta el relieve global como un modelo topográfico de precisión ni como dato oficial actualizado del IGN.

## Añadir o cambiar fuentes

El panel de importación permite dar de alta un WMS indicando dirección HTTPS, nombre técnico de capa, título y atribución, o una plantilla WMTS/XYZ compatible con `{z}`, `{x}`, `{y}` y EPSG:3857. No importa automáticamente una matriz WMTS arbitraria ni convierte GetCapabilities en una plantilla.

Para incluir una fuente oficial por defecto para todos los usuarios, añade otra entrada en `officialSources` de `src/lib/raster.ts`:

```ts
{
  id: 'mi-wms', name: 'Mi capa oficial', type: 'wms',
  url: 'https://servidor.example/wms', layers: 'nombre:tecnico',
  attribution: 'Organismo productor · licencia',
  visible: false, opacity: 0.8,
}
```

Los colores y grosores de una imagen WMS vienen del servidor. La aplicación ajusta su opacidad; para cambiar otros símbolos se necesita otro estilo admitido por el servicio o sus datos vectoriales. Los GeoJSON importados sí permiten modificar los estilos y consultar sus atributos dentro del visor.

Antes de publicar una fuente revisa HTTPS, CORS, la capa exacta, la versión WMS, EPSG:3857, cobertura geográfica y límites de escala. Una web con un visor incrustado no es una URL de datos. Si la pestaña Red del navegador muestra XML o HTML en vez de una imagen, suele haber una excepción WMS, un nombre de capa erróneo o una URL que apunta a otra aplicación. Un proxy tendría que alojarse fuera de GitHub Pages; el sitio estático no puede resolver por sí mismo la ausencia de CORS del proveedor.

## Comprobación real del 25/09/2026

Se ejecutó `node scripts/check-sources-live.mjs` a las 05:10 UTC. El registro completo, con URL, estado, tipo MIME, tamaño, huella SHA-256 y resultado por petición, está en `docs/sources-check.json`.

| Comprobación | Resultado |
| --- | --- |
| PNOA GetMap WMS 1.1.1 en EPSG:3857 sobre Oviedo | HTTP 200, image/png, firma PNG válida, 256 × 256, 185.388 bytes |
| Hidrografía HY.Network GetMap con los mismos parámetros | HTTP 200, image/png, firma PNG válida, 256 × 256, 4.703 bytes |
| GetCapabilities de ambos WMS | HTTP 200, XML de capacidades, capas previstas y EPSG:3857 presentes |
| Terrarium, tesela 8/123/93 | HTTP 200, image/png, firma PNG válida, 256 × 256, 117.196 bytes |
| OpenFreeMap claro y oscuro | HTTP 200, estilos JSON válidos |
| OpenFreeMap TileJSON, tesela vectorial y glifos Noto Sans Regular | HTTP 200, JSON y binarios no vacíos del tipo correspondiente |
| CORS de las diez peticiones con Origin de un sitio Pages | Access-Control-Allow-Origin: * en todas |

La prueba HTTP confirma una respuesta utilizable desde un origen web; no equivale por sí sola a comprobar cada píxel renderizado, todos los niveles de zoom o toda la cobertura mundial. La revisión visual del visor se documenta por separado. Una fuente externa puede cambiar de política, capa, URL, cobertura o disponibilidad. Este script es manual y está fuera de las pruebas y el workflow para no bombardear los servicios en cada compilación.

Para repetirla desde PowerShell:

```powershell
node scripts/check-sources-live.mjs
```
