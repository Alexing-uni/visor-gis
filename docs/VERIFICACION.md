# Pruebas y limitaciones · versión 1.2

## Comprobaciones de la actualización

Revisión del 2 de octubre de 2026, en local:

- `npm.cmd test`: 68 pruebas correctas. Las 48 anteriores se conservan; las nuevas cubren edificios, el fondo independiente de PNOA y la carga de elevaciones e imágenes: recorte correcto, cancelación, caché, descargas compartidas, límites, timeout, falta de cobertura y HTTP 503.
- Cambio Oscuro → PNOA repetido en 2D y 3D: España y Portugal conservan imágenes con colores naturales. PNOA utiliza un fondo satélite independiente del tema anterior.
- Relieve real Mapterhorn comprobado en Asturias. En Chile, respuestas 404 en zoom 13/14 activaron la recuperación de zoom 12 y el terreno siguió dibujándose. La falta de datos detallados no se confunde con un error de servidor.
- Prueba adicional de navegador con Canvas y el worker real TerrainLoader: los cuatro cuadrantes de una tesela conservaron alturas 255,5 / 256,5 / 511,75 / 1.024,25 m y sus límites geométricos originales. Las imágenes recuperadas conservaron los píxeles del cuadrante correspondiente. Los tests de Node por sí solos no verificaban esta parte.
- Satélite de VersaTiles tiene cobertura detallada desigual: Oviedo respondió 404 en zoom 13 y el cargador recuperó imágenes anteriores. La recuperación se utiliza tanto en MapLibre 2D como en deck.gl 3D, sin un servidor proxy.
- El comprobador de fuentes incluye ahora Liberty, TileJSON y DEM Mapterhorn de Oviedo y estilo e imagen satélite de Lisboa. Sus 15 recursos respondieron HTTP 200 y CORS `*`; las teselas nuevas tienen 512 × 512 px, comprobadas desde su cabecera WebP.
- PNOA sobre España y fondo general visible en Portugal, con hidrografía sobre la misma superficie 3D.
- Iluminación neutra del terreno revisada visualmente: no se observaron las manchas triangulares de sombreado en esa vista de prueba.
- Se revisó documentación oficial de Mapbox y la alternativa OpenFreeMap. TileJSON y una tesela vectorial de Oviedo respondieron HTTP 200; contenía alturas variadas y geometrías de edificios.
- Edificios con volumen comprobados visualmente en Oviedo, después de integrar el decodificador MVT completo y su trabajador local.
- Instalación limpia de la primera actualización 1.2 en una carpeta temporal: 602 paquetes instalados; ejecutable esbuild comprobado. La mejora posterior añade `@loaders.gl/core` como dependencia directa ya presente en el árbol y actualiza el lockfile; no se ha repetido esa instalación limpia después del cambio.
- Compilaciones finales local y Pages correctas. Pages se ha compilado con `/visor-gis/` y sus workers están incluidos.
- La compilación estática se ha abierto en `http://127.0.0.1:5174/visor-gis/`: carga las tres capas originales, búsqueda y vista de Oviedo con PNOA, terreno y edificios. No aparecieron errores en la consola de esa vista final; los workers locales funcionaron bajo el prefijo del repositorio.
- La mejora posterior se ha recompilado bajo `/visor-gis/` y abierto en el puerto 5175. Liberty en 2D, cambio Oscuro → PNOA, edificios en Oviedo y cambio Mapterhorn → AWS → Mapterhorn funcionan en esa compilación; no se registraron errores de aplicación en la consola final. Se han repetido las ventanas móvil 390 × 844 y tableta 768 × 1024 con los controles nuevos.
- Ventanas de escritorio 1280 × 720, móvil 390 × 844 y tableta 768 × 1024 revisadas. Abrir ajustes en móvil pliega el panel inferior; elegir origen libera el mapa y vuelve a 2D.
- Isócrona real de 20 minutos desde la catedral de Oviedo: contorno aproximado de 173,6 km² y acceso a carretera a 119 m; búsqueda, cálculo y controles de borrado comprobados en el navegador.
- Word 1.2 generado y verificado: 15 apartados con estilos de títulos, dos tablas, índice y numeración. El renderizador falló porque no hay `soffice.exe` de LibreOffice en el entorno; la paginación no se ha revisado visualmente.

La revisión visual de páginas del Word sigue pendiente. Implementar una función no garantiza su aspecto en todas las GPU.

## Evidencia conservada de versiones anteriores

- Instalación y funcionamiento de los modos local y estático; compilaciones local y Pages.
- 45 comparaciones del recuento con Shapely/GEOS, todas coincidentes: [detalle](RECUENTO.md) y `count-audit.json`.
- Los comprobadores externos se han repetido el 2 de octubre y han actualizado `routing-check.json` y `sources-check.json`: ruta Oviedo–Gijón de 32,4 km y 30 indicaciones, punto oceánico rechazado, PNOA, hidrografía, Terrarium y recursos OpenFreeMap correctos, con CORS. Validan HTTP y respuestas, no todos los aspectos del dibujo.
- Isócrona real de 20 minutos desde Oviedo; acceso a carretera a 64,4 m en el punto de prueba y origen oceánico rechazado antes de calcular.
- Panel y selección de origen en una ventana móvil de 390 × 844; comprobaciones de escritorio y tableta.
- PNOA conservando Portugal en 2D/3D, exageración cero y regreso a 2D.
- Publicación de 1.1 en GitHub Pages; no equivale a publicar 1.2.

Cada JSON conserva la fecha de la comprobación correspondiente; el informe independiente de recuentos mantiene su fecha anterior. Las pruebas automáticas usan respuestas simuladas para comprobar errores de forma reproducible; las comprobaciones reales las complementan.

## Repetir las comprobaciones

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run build:pages
npm.cmd run check:routing
```

`scripts/check-sources-live.mjs` repite las comprobaciones de fuentes. Los scripts de `docs/RECUENTO.md` permiten repetir la comparación independiente. Estas peticiones necesitan conexión y pueden fallar aunque el código no cambie.

## Límites que siguen vigentes

- No se han probado móviles físicos ni todas las tarjetas gráficas. El 3D exige WebGL.
- Edificios son volúmenes orientativos OSM/OpenMapTiles; pueden faltar, estar agrupados por teselas o deformarse sobre pendientes. No participan en el recuento GIS.
- Claro/Oscuro y Cartográfico usan cartografía distinta en 2D y 3D: el aspecto y las etiquetas pueden variar.
- Mapterhorn y las imágenes satélite ofrecen detalle distinto según zona; reutilizar un nivel anterior evita huecos pero no aporta precisión nueva. Las fotografías de distintos proveedores pueden mostrar transiciones de color y fecha.
- La textura intermedia de deck.gl puede perder nitidez al aumentar mucho el zoom; cargar imágenes hasta zoom 19 no aumenta la resolución real del DEM. Algunos iconos del estilo externo pueden faltar.
- Los proveedores no garantizan disponibilidad permanente. No se ha probado cualquier importación o archivo grande.
- Las páginas de condiciones FOSSGIS bloquearon la lectura automatizada; no se ha deducido una cuota exacta.
- La auditoría anterior registró 11 avisos transitivos de dependencias. No se presenta como una auditoría nueva de 1.2.
- Persiste margen para reducir el tamaño del paquete y la carga inicial.

El código local y la web de Pages son entregas distintas: la publicación se confirma revisando Actions y abriendo la dirección desplegada.
