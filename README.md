# Visor GIS web 1.0

Una aplicación para ver datos geográficos, analizar una zona y calcular rutas en coche. Está hecha con React, TypeScript, deck.gl y MapLibre.

**[Abrir el visor](https://alexing-uni.github.io/visor-gis/)** · [Informe Word](docs/Visor_GIS_1.0.docx) · [Informe en texto](docs/MEMORIA.md)

## Qué puedes hacer

- Mostrar, ocultar y cambiar el estilo de las capas.
- Ver el mapa en 2D o con relieve en 3D.
- Seleccionar un rectángulo o dibujar un polígono por puntos. El modo libre calcula al cerrar la figura.
- Contar entidades, consultar estadísticas y exportar resultados.
- Buscar origen y destino y calcular una ruta real en coche.
- Importar GeoJSON y añadir fuentes de imágenes compatibles, como WMS.

Las imágenes de PNOA e hidrografía sirven de referencia visual: no aportan entidades al recuento. Las rutas usan servicios externos y no incluyen tráfico en tiempo real.

## Ejecutarlo en Windows

Instala Node.js 24 y abre esta carpeta en Visual Studio Code. En la terminal PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre http://127.0.0.1:5173. Para detenerlo, pulsa `Ctrl+C`. Detén los servidores antes de repetir `npm.cmd ci` para evitar bloqueos de archivos.

Para probar el modo sin backend:

```powershell
npm.cmd run dev:static
```

## Dónde está cada cosa

- `src/`: interfaz, mapa y herramientas.
- `public/data/`: datos geográficos.
- `server/`: backend local y configuración guardada en SQLite.
- `tests/`: pruebas automáticas; se ejecutan con `npm.cmd test`.
- `docs/`: informe y guías breves.

En GitHub Pages, los cambios e importaciones se guardan en el navegador. No se comparten con otros usuarios ni dispositivos.

## Guías

[Publicar en GitHub Pages](docs/PAGES.md) · [Análisis](docs/ANALISIS.md) · [Rutas](docs/RUTAS.md) · [Datos e importación](docs/DATOS.md) · [Fuentes y relieve](docs/FUENTES.md)

Para entender el código: [estructura](docs/ARCHITECTURE.md). Para conocer el estado real: [funciones y límites](docs/ACEPTACION.md), [pruebas realizadas](docs/VERIFICACION.md) y [revisión del recuento](docs/RECUENTO.md).
