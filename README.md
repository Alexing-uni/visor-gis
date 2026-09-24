# Visor GIS — datos reales del tutor

React + TypeScript + Vite, MapLibre, DeckGL, Ant Design, proj4 y Turf. Backend Express y base SQLite para conservar los ajustes de las capas. Esta versión integra los tres GeoJSON recibidos en GIS_Proyectin.zip.

| Capa | Elementos | Geometría | Origen | Zona |
| --- | ---: | --- | --- | --- |
| Puntos | 9.999 | Point | EPSG:31994 | Chile |
| Geología | 399 | Polygon | OGC:CRS84 | Chile |
| Viales | 6.233 | MultiLineString, XYZ | EPSG:4258 | Asturias, España |

Las capas están en dos regiones. El visor se abre en Chile; usa **Encuadrar** en Viales para desplazarte a Asturias.

## Ejecutar en Windows

Requiere Node.js 24 o superior. Abre la carpeta que contiene este README y package.json en VS Code; en la terminal integrada ejecuta:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre la dirección indicada por Vite, normalmente http://127.0.0.1:5173. La API usa el puerto 3001. Ambos procesos se detienen con Ctrl+C. `npm.cmd` evita el bloqueo de npm.ps1 que puede imponer PowerShell.

Para compilar y ejecutar la versión empaquetada:

```powershell
npm.cmd run build
npm.cmd start
```

Abre http://127.0.0.1:3001. La base `server/visor.sqlite` se crea automáticamente.

## Actualizar tu copia anterior

1. Detén `npm.cmd run dev` con Ctrl+C.
2. Guarda una copia de tu carpeta actual, o haz un commit de tus cambios locales.
3. Copia el contenido de la carpeta visor-gis del ZIP sobre tu carpeta del proyecto. El ZIP no contiene `.git`, `node_modules` ni una base de datos: tu historial y SQLite local se conservan. Revisa antes de sobrescribir archivos de código que hayas modificado por tu cuenta.
4. Ejecuta `npm.cmd ci`, `npm.cmd test` y `npm.cmd run dev`.
5. Revisa los cambios con `git diff` y confirma los archivos que quieras subir a tu repositorio.

SQLite añade automáticamente el radio independiente sin borrar los estilos guardados. Si conservas la base antigua, también se conservan sus grosores; puedes ajustarlos desde las tarjetas.

## Recorrido del código

| Carpeta o archivo | Responsabilidad |
| --- | --- |
| src/main.tsx | Entrada de React y configuración de Ant Design. |
| src/App.tsx | Organización de la interfaz y selección de entidades. |
| src/components/ | Mapa, tarjeta de capa, buscador y popup. |
| src/hooks/useLayers.ts | Carga paralela, errores y cambios en la API. |
| src/model/ | Interfaz Layer, BaseLayer y especializaciones del PDF. |
| src/lib/ | HTTP, GeoJSON, CRS y destinos de cámara. |
| src/types.ts | Contratos de datos compartidos por el frontend. |
| server/ | API Express, SQLite y catálogo geográfico local. |
| public/data/ | Los tres GeoJSON originales, con nombres normalizados. |
| scripts/update-places.mjs | Regenera el catálogo local a partir de las geometrías. |
| tests/ | Pruebas de datos reales, API, persistencia y migración. |
| docs/ | Explicación paso a paso, procedencia y aceptación. |

Lee [ARCHITECTURE.md](docs/ARCHITECTURE.md) para entender el funcionamiento completo, [DATOS.md](docs/DATOS.md) para los CRS y atributos y [ACEPTACION.md](docs/ACEPTACION.md) para comprobar los ocho hitos.

## Búsqueda y conexiones externas

El buscador consulta un catálogo local de cinco ubicaciones relacionado con Chile y Asturias. No es una búsqueda mundial ni envía consultas a Nominatim. Para ampliar su cobertura puede conectarse el geocodificador acordado con el tutor. `npm.cmd run data:catalog` regenera el catálogo tras actualizar los archivos; reinicia después la API.

Los fondos Claro y Oscuro utilizan CARTO y requieren Internet. Sin fondo permite seguir trabajando con las geometrías locales. La vista 3D inclina la cámara; no genera terreno ni transforma las alturas.

## Verificación

```powershell
npm.cmd test
npm.cmd run build
```

Las seis pruebas automatizadas y la compilación se han ejecutado correctamente. La comprobación visual final de WebGL e interacciones está pendiente en tu navegador. GitHub Actions ejecuta también las pruebas y el build cuando se publica un cambio.
