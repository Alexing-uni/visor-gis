# Visor GIS 0.4

Explora capas geográficas, consulta sus atributos, analiza una zona y calcula recorridos reales en coche. React y TypeScript organizan la interfaz; **deck.gl dibuja los vectores, imágenes WMS/WMTS, selecciones y rutas**. MapLibre aporta el mapa base y el relieve.

[Repositorio](https://github.com/Alexing-uni/visor-gis) · [Guía GitHub Pages](docs/PAGES.md) · [Memoria completa](docs/MEMORIA.md) · [Memoria Word](docs/Visor_GIS_0.4.docx)

**Estado de entrega:** versión 0.4 implementada y comprobada localmente. El workflow de GitHub Actions publica la modalidad estática al actualizar `main`. Consulta [Actions](https://github.com/Alexing-uni/visor-gis/actions) para conocer el estado del despliegue y [la guía](docs/PAGES.md) para repetirlo.

## Empezar en Windows y Visual Studio Code

Instala Node.js 24 LTS y Git. Abre esta carpeta en VS Code y su terminal PowerShell:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run dev
```

Abre la URL indicada por Vite, normalmente http://127.0.0.1:5173. Express escucha en http://127.0.0.1:3001. Detén ambos con Ctrl+C. Se usa `npm.cmd` para evitar restricciones de ejecución de `npm.ps1`.

Para la versión local compilada:

```powershell
npm.cmd run build
npm.cmd start
```

Abre http://127.0.0.1:3001. SQLite se crea en `server/visor.sqlite`. Una base anterior conserva los estilos al migrarse. El servidor se limita por defecto a `127.0.0.1`; no incorpora cuentas ni autorización multiusuario.

Para trabajar **sin backend**, igual que en Pages:

```powershell
npm.cmd run dev:static
```

Para comprobar el paquete estático bajo la subcarpeta del repositorio:

```powershell
$env:VITE_BASE_PATH = '/visor-gis/'
npm.cmd run build:pages
npm.cmd run preview
```

Abre http://127.0.0.1:4173/visor-gis/. Al volver a compilar el modo local en esa terminal, elimina la variable con `Remove-Item Env:VITE_BASE_PATH`. No abras `index.html` con doble clic: necesita un servidor HTTP.

## Qué puedes hacer

- **Capas:** activar, renombrar, ordenar, encuadrar, cambiar color, opacidad, grosor y radio. Pulsa una entidad para consultar sus atributos. Los datos originales se conservan.
- **Análisis:** dibuja un rectángulo arrastrando o marcando dos esquinas. Incluye entidades que intersectan su geometría real, también el borde. Cada Feature cuenta una vez, incluso MultiPoint, MultiLineString y MultiPolygon. Calcula km²/ha, recuentos, estadísticas y medidas recortadas. Exporta JSON, CSV o entidades GeoJSON completas. [Criterio y límites](docs/ANALISIS.md).
- **Rutas:** busca con Photon, selecciona cada resultado o elige A/B en el mapa. Puedes mover el mapa durante la elección, intercambiar puntos, calcular y limpiar. OSRM devuelve la geometría vial, distancia, tiempo estimado e indicaciones. Solo coche, sin tráfico en tiempo real. [Proveedor, errores y límites](docs/RUTAS.md).
- **Fuentes:** ortofoto PNOA y red hidrográfica oficial del IGN, con atribución y opacidad. Cubren España; usa Ver España o encuadra Viales. Son imágenes WMS: no se cuentan entidades en ellas. Puedes registrar otros WMS y WMTS compatibles. [Fuentes](docs/FUENTES.md).
- **Importar:** GeoJSON desde archivo o URL directa, máximo 30 MiB. Selecciona el CRS correcto; se normaliza a WGS84. Los datos mixtos se separan por geometría. Prueba `public/data/example-import.geojson`, una muestra ficticia claramente identificada. Una página de otro visor no es GeoJSON.
- **Mapa y relieve:** fondos claro, oscuro o vacío; vista 2D/3D, giro y elevación Terrarium con exageración ajustable. Las capas deck.gl no se adaptan a la superficie del terreno; selección y puntos de ruta se realizan en 2D.

El panel se pliega con la flecha o el botón de su herramienta. En ordenador puedes arrastrar su borde o usar las flechas del teclado al enfocar el separador. En móvil pasa a un panel inferior; al iniciar una selección se pliega para dejar libre el mapa. Los resultados vuelven al panel al terminar.

## Datos y almacenamiento

| Capa original | Entidades | CRS de origen | Zona |
| --- | ---: | --- | --- |
| Puntos | 9.999 | EPSG:31994 | Chile |
| Geología | 399 | EPSG:4326 / CRS84 | Chile |
| Viales | 6.233 | EPSG:4258, XYZ | Asturias |

[Procedencia y atributos originales](docs/DATOS.md). La normalización conserva la Z sin transformar su datum vertical. Las medidas de análisis ignoran Z y relieve; son aproximaciones geográficas, no medidas topográficas. Identificadores, índices y códigos reconocidos se excluyen de las estadísticas; no se suman magnitudes conocidas no aditivas. Los atributos pertenecen a la entidad completa y no se prorratean por el área seleccionada.

| Información | Modo local | Pages |
| --- | --- | --- |
| GeoJSON originales | Archivos del proyecto, leídos por API | Archivos estáticos públicos |
| Estilos y orden originales | SQLite | IndexedDB de cada navegador |
| GeoJSON importados y sus estilos | IndexedDB de cada navegador | IndexedDB de cada navegador |
| Fuentes ráster y su opacidad | localStorage | localStorage |
| Ruta y selección activa | Solo memoria; se pierden al recargar | Solo memoria; se pierden al recargar |

Importar no sube archivos a GitHub ni al backend. Borrar los datos del navegador elimina las copias y preferencias locales; conserva los originales. Los proveedores externos reciben peticiones de mapa, búsquedas o coordenadas al usar sus funciones. Sin Internet puedes usar geometrías ya disponibles con Sin fondo; esta versión no implementa una aplicación offline ni precarga de servicios.

## Publicación en GitHub Pages

El workflow `.github/workflows/pages.yml` instala, prueba, compila la modalidad estática y publica `dist`. Pages **no ejecuta Express ni SQLite**. `.env.static` activa IndexedDB; Vite obtiene la ruta de recursos del repositorio mediante `actions/configure-pages`.

1. Usa este repositorio o crea uno en GitHub y configura su remoto.
2. Sube el código y `package-lock.json`, sin `node_modules`, bases SQLite ni archivos `.env` privados.
3. En Settings → Pages → Build and deployment, selecciona **GitHub Actions**.
4. Publica un commit en `main` o ejecuta el workflow desde Actions → Run workflow.
5. Comprueba los trabajos build/deploy y abre la dirección que aparezca en Settings → Pages o en el entorno github-pages.
6. Para actualizar, modifica los archivos fuente, ejecuta las pruebas y sube otro commit a `main`.

La [guía detallada](docs/PAGES.md) incluye todos los comandos, rutas, errores habituales y diferencias de almacenamiento. La dirección esperada para este repositorio es https://alexing-uni.github.io/visor-gis/; su disponibilidad depende de que el despliegue termine correctamente.

## Para entender y ampliar el proyecto

| Archivo | Para qué sirve y cuándo modificarlo |
| --- | --- |
| `src/App.tsx` | Conecta los paneles, capas, selecciones y extremos de ruta. |
| `src/components/MapView.tsx` | Inicializa MapLibre y el overlay deck.gl; dibuja capas y gestiona la interacción. |
| `src/components/LayerCard.tsx` | Controles de estilo y orden de cada vector. |
| `src/model/` | Clases de puntos, líneas y polígonos; atributos del popup y símbolos. |
| `src/hooks/useLayers.ts` | Carga, normalización y cola de guardado. |
| `src/lib/analysis.ts` | Intersección, recorte, unidades, estadísticas y exportación. |
| `src/lib/routing.ts` | Photon/OSRM, cachés, tiempos límite y tratamiento de errores. |
| `src/lib/import.ts` | Validación de enlaces, formatos, tamaño y separación por geometría. |
| `src/lib/storage.ts` | Persistencia IndexedDB mediante transacciones. |
| `src/lib/geojson.ts` | Validación y transformación de coordenadas con proj4. |
| `src/lib/raster.ts` | Catálogo oficial y construcción de peticiones WMS/WMTS. |
| `src/config/defaultLayers.ts` | Registro de capas originales para el modo estático. |
| `server/database.js` | Registro de originales y migraciones SQLite del modo local. |
| `public/data/` | Datos originales, catálogo de lugares y ejemplo de importación. |
| `src/style.css` | Distribución de paneles, estilos y adaptación a pantallas. |
| `vite.config.ts` | Ruta base de publicación y proxy de desarrollo a la API. |

Para publicar una nueva capa propia, coloca su GeoJSON en `public/data/`, registra id, nombre, tipo, CRS y estilo en `src/config/defaultLayers.ts` y `server/database.js`. Añade la definición de proyección en `src/lib/geojson.ts` si no está soportada. Para personalizar atributos modifica las especializaciones de `src/model/`; los imports muestran todos sus atributos. Reinicia el backend y recompila Pages. La memoria explica ejemplos de código, migraciones y cómo reutilizar esta base para otro visor.

## Comprobaciones y límites

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run build:pages
npm.cmd run check:routing
node scripts/check-sources-live.mjs --write
```

Los dos últimos comandos requieren Internet y hacen consultas moderadas a servicios reales; no forman parte de las pruebas de CI. Los resultados fechados se guardan en `docs/routing-check.json` y `docs/sources-check.json`. El [registro de verificación](docs/VERIFICACION.md) diferencia pruebas automatizadas, navegador, servicios y comprobaciones pendientes.

El visor admite los seis tipos simples/múltiples de GeoJSON. GeometryCollection, Shapefile, KML, WFS, WMTS con matrices arbitrarias, edición de geometrías, usuarios y datos compartidos requieren ampliaciones. No transforma una URL de aplicación en datos ni representa rectas como rutas. La carga completa y el análisis en el navegador limitan el volumen utilizable.

La memoria se mantiene en `docs/MEMORIA.md`. `scripts/generate-docx.py` genera el Word con Python y `python-docx`; este paso no es necesario para ejecutar el visor. El índice usa estilos de título y se actualiza en Word con Actualizar campo → Actualizar toda la tabla.

