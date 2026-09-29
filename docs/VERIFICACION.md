# Pruebas y limitaciones de la versión 1.1

## Comprobaciones de esta actualización

Revisión del 28 de septiembre de 2026, en local:

- `npm.cmd test`: 48 pruebas correctas. Incluyen API y SQLite temporal, IndexedDB simulado con persistencia y transacciones, análisis, importación, rutas, imágenes, alturas y alcance.
- Compilaciones local y estática verificadas con TypeScript y Vite. Persisten avisos de tamaño del paquete y anotaciones de dependencias.
- Versión 1.1.0 en `package.json` y la raíz del lockfile; versión 1.1 en la interfaz.
- Word 1.1 generado desde `MEMORIA.md`: 15 apartados numerados, dos tablas, títulos nativos, índice con campo TOC y marcadores. El generador comprueba la estructura.
- El envío a `main` activa Pages. La compilación local no demuestra por sí sola que el despliegue de GitHub haya terminado; consulta Actions y la web publicada.

## Pruebas funcionales de la ampliación

Realizadas en esta sesión antes de la actualización documental:

- Alcance real de 20 minutos desde Oviedo con Valhalla. Acceso a carretera encontrado a 64,4 m del punto de prueba; origen en el océano rechazado.
- Ventana móvil de 390 × 844: elección de origen, plegado del panel y resultado encuadrado por encima del panel inferior.
- Terreno con PNOA y capas vectoriales; exageración cero y retorno a 2D.
- PNOA como mapa base regional conservando Portugal y el fondo mundial en 2D y 3D; sin errores en consola en esa comprobación.

Estas pruebas reales complementan las pruebas automáticas, que usan respuestas simuladas para comprobar errores de proveedores de forma reproducible.

## Evidencia conservada de versiones anteriores

- Instalación y funcionamiento de los modos local y estático.
- 45 comparaciones del recuento con Shapely/GEOS, todas coincidentes: [detalle](RECUENTO.md) y `count-audit.json`.
- Ruta real Oviedo–Gijón con OSRM y caso sin acceso: `routing-check.json`.
- Fuentes oficiales y otras respuestas externas: `sources-check.json`.
- Interfaz en ventanas de 1280 × 720, 1024 × 768 y 390 × 844.
- Publicación de la versión anterior en GitHub Pages. No equivale a publicar la 1.1.

Los JSON conservan las fechas originales: no se presentan como peticiones repetidas hoy.

## Repetir comprobaciones

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run build:pages
npm.cmd run check:routing
```

`scripts/check-sources-live.mjs` permite repetir las comprobaciones de fuentes. Los scripts de `docs/RECUENTO.md` repiten la comparación independiente. Las peticiones reales necesitan conexión y pueden fallar aunque el código no cambie.

## Pendiente y límites

- Revisión visual del Word: se ejecutó el renderizador empaquetado, pero falló por ausencia de `soffice.exe` de LibreOffice. No se han podido inspeccionar las páginas renderizadas; la validación de contenido y XML no sustituye esa comprobación.
- Uso táctil en móviles o tabletas físicos y compatibilidad con todas las tarjetas gráficas.
- Disponibilidad permanente de proveedores y prueba de todos los archivos importables o de grandes volúmenes.
- Auditoría previa del 25 de septiembre: 11 avisos transitivos (3 moderados y 8 altos), pendientes de revisión; no se ha ejecutado una nueva auditoría de seguridad en esta actualización documental.
- Paquete principal de aproximadamente 3,16 MB sin comprimir; queda margen para reducir la carga inicial.
