# Mapa base, fuentes y relieve

El fondo 2D utiliza OpenFreeMap. En 3D, deck.gl dibuja un terreno con elevaciones Terrarium de AWS y textura OpenStreetMap. La exageración va de 0 (plano) a 3, con 1 como altura sin exagerar.

Las capas, imágenes y rutas se adaptan a la misma superficie mediante TerrainExtension. Una copia de dibujo elimina su Z propia para evitar que floten; los originales conservan esa coordenada. El análisis y la selección de puntos se realizan en 2D. El modelo no representa edificios o puentes elevados.

En Fuentes, «Mapa base regional» sustituye visualmente el fondo solo donde aporta imagen. Así, PNOA cubre España y Portugal sigue visible. Con opacidad menor que 100 % ambos se mezclan. Los huecos dependen de la transparencia del servicio; «Sin fondo» desactiva el apoyo global. Solo se activa una imagen base regional a la vez; las capas temáticas pueden seguir superpuestas.

## Fuentes incluidas

- **PNOA del IGN**: ortofotografía, útil para reconocer edificios y parcelas.
- **Hidrografía de IGN/IDEE**: referencia visual de la red hidrográfica.

Ambas se consumen como imágenes WMS: no permiten contar automáticamente ríos u otros objetos. El visor muestra las atribuciones; deben conservarse al reutilizar el proyecto.

## Añadir una fuente

Usa el panel de fuentes con un WMS compatible o una plantilla WMTS admitida. Para dejar una fuente registrada en el código, edita `src/lib/raster.ts`, siguiendo una entrada existente: dirección, nombre de capa, formato y atribución.

No pegues la dirección de otra aplicación esperando importar sus datos. Comprueba el servicio y sus condiciones de uso. En Pages, el servidor externo debe admitir HTTPS y acceso desde el navegador. Una respuesta correcta fuera del navegador no garantiza que CORS permita cargarla.

Las comprobaciones guardadas están en `sources-check.json`. La disponibilidad puede cambiar porque son servicios externos.
