# Verificación de la versión 0.4

Fecha de comprobación: 25 de septiembre de 2026. Los datos originales se conservan.

## Estado de publicación

La publicación se realiza en `Alexing-uni/visor-gis` mediante Git y el workflow de Pages. En el repositorio se seleccionó GitHub Actions como origen. Revisa [Actions](https://github.com/Alexing-uni/visor-gis/actions) para conocer el resultado de cada despliegue; compilar localmente no prueba por sí solo el dominio público. Sigue [PAGES.md](PAGES.md) para futuras actualizaciones.

## Comprobaciones realizadas

- Auditoría independiente del recuento: 45 selecciones contrastadas con GEOS, comparando los registros exactos, sin diferencias. Incluye las tres capas reales y 1.265 entidades sintéticas para bordes y geometrías múltiples. Véase [RECUENTO.md](RECUENTO.md).

- Instalación mediante `npm.cmd ci`; dependencias fijadas en `package-lock.json`.
- `npm.cmd test`: 42 pruebas superadas. Incluyen geometrías reales y múltiples, recorte de líneas/polígonos, huecos, contactos en bordes, estadísticas, exportación CSV, CRS, API y SQLite, migraciones, rutas, importación, transacciones IndexedDB y errores/reintentos ráster.
- Compilación TypeScript y producción local; compilación estática con `VITE_BASE_PATH=/visor-gis/` y vista previa bajo esa subruta.
- Navegador: carga de 9.999 puntos, 6.233 líneas y 399 polígonos; encuadre, selección por arrastre y por dos esquinas, resultados y resaltado. Revisión visual a 1280×720, 1024×768 y 390×844.
- Importación real del ejemplo GeoJSON desde una URL: cuatro entidades separadas en tres capas y recuperadas después de recargar la página, usando IndexedDB del navegador.
- Vista 3D y relieve activados en la compilación final después de corregir la integración: dibujo comprobado y sin errores de consola en esa prueba.
- Ruta real Oviedo–Gijón desde buscador, distancia, duración e indicaciones; intercambio elimina el resultado antiguo. Elección en mapa distingue arrastre de pulsación.
- Photon y OSRM en red: respuesta válida y rechazo de un punto oceánico. Detalles y cifras reproducibles en [RUTAS.md](RUTAS.md) y [routing-check.json](routing-check.json).
- Diez comprobaciones HTTP de fuentes, incluyendo WMS PNOA e hidrografía, capacidades, imágenes, CORS, relieve y recursos del mapa base. Resultados en [FUENTES.md](FUENTES.md) y [sources-check.json](sources-check.json). Ortofoto e hidrografía también revisadas visualmente en el navegador.

- Selección libre verificada en navegador de escritorio y tamaño móvil: sin resultados antes de cerrar, cierre por primer punto o botón, deshacer, rechazo de cruces y retorno al rectángulo. Cinco nuevas pruebas cubren contornos reales, concavidad, líneas, superficies, exportación y validación.

## Correcciones durante la comprobación

El mapa base usa OpenFreeMap. Se corrigió la carga del worker de MapLibre 6 en Vite y la integración de su elevación con deck.gl: `DeckCompatibleMap` en `src/components/MapView.tsx` proporciona a la superposición no intercalada la elevación obtenida por `getCenterElevation()`. No se utilizan campos internos de MapLibre. Este adaptador no permite cambiar a `interleaved: true` sin revisar la integración.

Las imágenes ráster tienen tiempo máximo de espera y dos intentos ante fallos temporales de red o servidor. Si siguen fallando se muestra el error; una tesela vacía no se interpreta como ausencia de entidades.

## Límites y comprobaciones pendientes

- No se han probado teléfonos o tabletas físicos ni todos los navegadores/GPU. La simulación de tamaño no certifica gestos táctiles reales.
- El Word tiene 15 apartados, estilos de título, índice actualizable, tablas y enlaces; su estructura se comprobó. No fue posible renderizar sus páginas porque falta `soffice.exe` en el entorno autorizado. La revisión visual página por página queda pendiente en Word.
- `npm audit` informa de 11 avisos transitivos (3 moderados y 8 altos). MapLibre se actualizó a 6.11.2 para eliminar el aviso crítico de su sanitizador. Permanecen avisos de cadenas de carga/compresión de dependencias; no se aplicó una degradación forzada de deck.gl. Repetir la auditoría antes de una explotación pública con datos no fiables; no se certifica ausencia de vulnerabilidades.
- Vite avisa de un paquete principal grande (aproximadamente 3,1 MB antes de gzip). La carga inicial y el análisis de archivos grandes pueden ser lentos; no se han hecho pruebas de carga masivas.
- Los proveedores externos pueden limitar o interrumpir el servicio. Solo hay rutas de coche, sin tráfico en tiempo real. Los ráster no ofrecen recuentos vectoriales; las medidas no incorporan altitud; las capas deck.gl no se amoldan al terreno.
- La modalidad Pages guarda importaciones y estilos en el navegador, no en un servidor compartido. Borrar sus datos elimina esas copias.

## Repetir las pruebas

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
$env:VITE_BASE_PATH='/visor-gis/'
npm.cmd run build:pages
npm.cmd run preview -- --mode static
npm.cmd run check:routing
node scripts/check-sources-live.mjs
```

Las consultas en vivo necesitan Internet y no forman parte de las pruebas deterministas de CI. Consulta [PAGES.md](PAGES.md) para revisar el estado del despliegue en Actions y la dirección publicada.

