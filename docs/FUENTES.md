# Mapa base, fuentes y relieve

El mapa base utiliza OpenFreeMap. Puedes cambiar su aspecto y pasar entre vista 2D y 3D. El relieve usa teselas Terrarium alojadas en AWS; el control de exageración cambia su apariencia.

Las capas deck.gl no se adaptan a la superficie del terreno. El análisis y la selección de puntos de ruta se realizan en 2D para evitar confusiones al pulsar.

## Fuentes incluidas

- **PNOA del IGN**: ortofotografía, útil para reconocer edificios y parcelas.
- **Hidrografía de IGN/IDEE**: referencia visual de la red hidrográfica.

Ambas se consumen como imágenes WMS: no permiten contar automáticamente ríos u otros objetos. El visor muestra las atribuciones; deben conservarse al reutilizar el proyecto.

## Añadir una fuente

Usa el panel de fuentes con un WMS compatible o una plantilla WMTS admitida. Para dejar una fuente registrada en el código, edita `src/lib/raster.ts`, siguiendo una entrada existente: dirección, nombre de capa, formato y atribución.

No pegues la dirección de otra aplicación esperando importar sus datos. Comprueba el servicio y sus condiciones de uso. En Pages, el servidor externo debe admitir HTTPS y acceso desde el navegador. Una respuesta correcta fuera del navegador no garantiza que CORS permita cargarla.

Las comprobaciones guardadas están en `sources-check.json`. La disponibilidad puede cambiar porque son servicios externos.
