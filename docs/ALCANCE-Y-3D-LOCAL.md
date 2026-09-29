# Terreno y alcance de la versión 1.1

## Terreno y alturas

En «Mapa y relieve», Vista 3D activa una malla de elevaciones reales Terrarium dibujada por deck.gl. Las capas vectoriales, rutas, selecciones e imágenes se adaptan a esa misma superficie mediante TerrainExtension. MapLibre sigue controlando la cámara y el fondo 2D; ya no dibuja un terreno separado.

La exageración cambia entre 0 y 3: 0 aplana el terreno; 1 representa la altura del modelo sin exageración. Para analizar y marcar puntos, el visor vuelve a 2D. Los datos originales conservan su Z, pero se dibuja una copia sin alturas propias para que calles y ríos no floten. Las exportaciones siguen usando las geometrías originales.

El relieve es un modelo global aproximado: no representa edificios, interiores, puentes elevados ni fotogrametría. La extensión de deck.gl es experimental. En 3D se usa una textura OpenStreetMap; en 2D se conservan los fondos OpenFreeMap claro y oscuro. La conexión y WebGL son necesarios.

## Mapa base regional y fondo global

Cada fuente tiene un selector «Uso». «Mapa base regional» sustituye visualmente el fondo solo donde aporta imagen y apaga las otras imágenes base regionales. «Capa superpuesta» se reserva para información temática, como ríos. PNOA viene marcado como mapa base. Una nueva fuente se registra como base por defecto, pero puedes cambiarlo.

El fondo global permanece debajo en 2D y 3D: PNOA muestra España y el mapa global sigue mostrando Portugal y las zonas sin imagen. Con opacidad del 100 %, los píxeles opacos sustituyen visualmente al fondo; los transparentes dejan verlo. Si bajas la opacidad, ambos se mezclan. Al desactivar la imagen regional, se ve todo el fondo global. «Sin fondo» desactiva expresamente ese fondo de apoyo. La cobertura depende de la extensión configurada y de la transparencia que entregue el servicio; una imagen opaca sin datos no se puede reconocer automáticamente como un hueco. Las preferencias se guardan en el navegador. Los servicios oficiales solo se solicitan dentro de su extensión de España.

## Área de alcance en coche

Abre «Alcance», busca un origen o márcalo en el mapa. Elige entre 5 y 60 minutos (20 por defecto) y pulsa «Calcular alcance». Puedes borrar el resultado y exportar su GeoJSON.

Valhalla consulta la red de carreteras de OpenStreetMap y devuelve una isócrona: un contorno aproximado de los lugares accesibles en ese tiempo, considerando salida desde el origen. Antes de calcular, se comprueba que haya un acceso a carretera a menos de 1 km. El tiempo no incluye el tramo entre el punto elegido y ese acceso, cuya distancia se muestra.

El área no es una lista de todas las calles transitables: el contorno puede contener zonas sin acceso directo. No representa batería, autonomía eléctrica, ida y vuelta ni tráfico en tiempo real. Valhalla/FOSSGIS es un servicio público de demostración para uso moderado; el cálculo puede fallar por cobertura, cuota o conexión. Las coordenadas se envían al calcular; las direcciones se buscan mediante Photon.

## Archivos principales

- `src/lib/elevation.ts`: copia para dibujo sin Z y decodificación Terrarium.
- `src/components/MapView.tsx`: terreno, adaptación de capas y fondos.
- `src/lib/raster.ts` y `SourcesPanel.tsx`: exclusión entre mapas base.
- `src/lib/serviceArea.ts`: acceso a carretera y petición de isócrona.
- `src/components/ServiceAreaPanel.tsx`: controles y exportación.
- `tests/terrain-service-area.test.mjs`: pruebas nuevas.

El informe actualizado es `Visor_GIS_1.1.docx`, generado desde `MEMORIA.md`. La versión 1.1 se entrega en el repositorio. El estado de GitHub Pages se consulta en Actions.

## Referencias

- [TerrainExtension de deck.gl](https://deck.gl/docs/api-reference/extensions/terrain-extension)
- [API de Valhalla](https://valhalla.github.io/valhalla/api/)
- [Uso de teselas OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)

## Comprobaciones del 28 de septiembre de 2026

- 48 pruebas automáticas correctas, incluidas las 42 anteriores.
- Compilaciones local y estática comprobadas antes de publicar.
- Alcance real de 20 minutos desde Oviedo. La comprobación independiente del acceso devolvió una carretera a 64,4 m del punto solicitado.
- Origen en el océano rechazado antes de calcular el contorno.
- Vista de escritorio y móvil de 390 × 844: selección de origen, plegado del panel y resultado visible.
- Cobertura regional comprobada en el navegador: PNOA sobre España y fondo global visible en Portugal, tanto en 2D como en 3D, sin errores en consola.
- PNOA y viales sobre terreno; exageración cero y retorno a 2D comprobados en el navegador.

No se han probado móviles físicos ni todas las tarjetas gráficas. La calidad del relieve depende de la resolución del modelo y las imágenes; los servicios externos pueden fallar. Persisten los avisos de dependencias y tamaño de compilación que ya tenía la versión anterior.
