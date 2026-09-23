# Visor geoespacial con DeckGL

Visor GIS extensible basado en la guía funcional del proyecto. Muestra puntos, líneas y polígonos sobre MapLibre, transforma sus coordenadas con proj4 y guarda la configuración de capas en SQLite.

## Abrir el proyecto en VS Code (Windows)

1. Instala [Node.js 24](https://nodejs.org/) y [Git](https://git-scm.com/).
2. Clona el repositorio y entra en la carpeta:

   ```powershell
   git clone https://github.com/TU_USUARIO/visor-gis.git
   cd visor-gis
   code .
   npm.cmd ci
   npm.cmd run dev
   ```

3. Abre la dirección que indique Vite, normalmente `http://localhost:5173`.

Si el comando `code .` no está disponible, abre VS Code y elige **Archivo → Abrir carpeta… → visor-gis**. En PowerShell usamos `npm.cmd` porque algunas políticas corporativas bloquean `npm.ps1`.

## Estructura para explorar en VS Code o GitHub

```text
visor-gis/
├── .github/workflows/ci.yml   Compilación al subir cambios
├── docs/ARCHITECTURE.md       Diagrama y flujo de datos
├── public/data/                GeoJSON de ejemplo
├── server/index.js             API y SQLite
├── src/
│   ├── lib/api.ts              Cliente HTTP
│   ├── lib/geojson.ts          Validación y proyecciones
│   ├── main.tsx                Visor y controles
│   ├── style.css               Aspecto visual
│   └── types.ts                Tipos de capa y entidad
├── index.html
├── package.json
└── vite.config.ts
```

## Funcionalidades

- Mapa navegable y tres capas independientes de demostración.
- Puntos EPSG:31994 → EPSG:4326; líneas EPSG:4258 → EPSG:4326; polígonos EPSG:4326.
- Visibilidad, nombre, color, grosor, opacidad y orden persistentes en SQLite.
- Selección de entidades, popup arrastrable, encuadre, búsqueda, estilos claro/oscuro, inclinación 2D/3D y bloqueo de giro.

Los datos son de **demostración**. Sustituye `public/data/*.geojson` con los archivos del tutor, verificando antes su CRS y la geometría. Consulta [la arquitectura](docs/ARCHITECTURE.md) para saber dónde ampliar el código.

## Comandos

| Comando | Resultado |
| --- | --- |
| `npm.cmd ci` | Instala exactamente las dependencias registradas. |
| `npm.cmd run dev` | Inicia frontend y API para desarrollo. |
| `npm.cmd run build` | Comprueba TypeScript y genera `dist/`. |
| `npm.cmd start` | Sirve la versión compilada en `http://localhost:3001`. |

El backend escucha en el puerto 3001 y Vite redirige `/api` a él. SQLite se crea localmente en `server/visor.sqlite` y no se publica en GitHub. El mapa base CARTO y la búsqueda Nominatim necesitan acceso a Internet; para uso corporativo, confirma los proveedores permitidos.
