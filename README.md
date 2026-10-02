# Visor GIS web 1.2

Un visor para consultar capas geográficas, analizar una zona y calcular rutas e isócronas en coche. Utiliza React, TypeScript, deck.gl y MapLibre.

La 1.2 reúne **Claro, Oscuro, Cartográfico, Satélite y Ortofoto PNOA** en «Mapa y relieve», coloca la hidrografía en «Capas» y añade edificios con volumen opcionales. PNOA conserva un fondo de imágenes fuera de España; el relieve permite elegir Mapterhorn o AWS. [Cambios](CHANGELOG.md) · [Explicación del proyecto](docs/MEMORIA.md) · [Informe Word](docs/Visor_GIS_1.2.docx).

## Qué puedes hacer

- Mostrar capas y ajustar sus estilos y opacidad.
- Alternar el fondo y utilizar relieve 3D con edificios orientativos.
- Analizar un rectángulo o un polígono por puntos, contando al cerrar la figura.
- Consultar estadísticas y exportar resultados.
- Buscar origen y destino y calcular una ruta real en coche.
- Dibujar la isócrona de un origen entre 5 y 60 minutos.
- Importar GeoJSON y servicios de imágenes compatibles.

PNOA, hidrografía WMS y edificios del fondo son referencias visuales: quedan fuera del recuento de capas GIS. Las alturas de edificios son orientativas; rutas e isócronas no incluyen tráfico en tiempo real.

## Ejecutarlo en Windows

Instala Node.js 24 y abre esta carpeta en Visual Studio Code. En PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre http://127.0.0.1:5173/. Para detenerlo, pulsa `Ctrl+C`. Detén los servidores antes de repetir `npm.cmd ci` para evitar que Windows bloquee archivos.

Para probar el modo sin backend:

```powershell
npm.cmd run dev:static
```

## Carpetas y guías

`src/` contiene la interfaz y herramientas; `public/data/`, los datos; `server/`, el backend local; `tests/`, las pruebas; `docs/`, las explicaciones.

En GitHub Pages los cambios e importaciones se guardan en ese navegador y no se comparten con otras personas o dispositivos.

[Mapa, relieve e isócronas](docs/ISOCRONAS-Y-3D.md) · [Estilos y alternativas 3D](docs/ESTILOS-Y-RELIEVE.md) · [APIs y proveedores](docs/PROVEEDORES.md) · [Importar datos](docs/DATOS.md) · [Análisis](docs/ANALISIS.md) · [Rutas](docs/RUTAS.md) · [Publicar en Pages](docs/PAGES.md) · [Pruebas y límites](docs/VERIFICACION.md).

[Abrir el visor publicado](https://alexing-uni.github.io/visor-gis/). La versión de la web depende del último despliegue completado; cambiar el código local no la actualiza automáticamente.
