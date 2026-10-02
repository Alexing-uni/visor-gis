# Mapa, relieve e isócronas · versión 1.2

## Elegir el mapa

Abre «Mapa y relieve» y elige **Claro, Oscuro, Cartográfico en color, Satélite global u Ortofoto PNOA**. También se conserva «Sin fondo» y los mapas regionales que hayas registrado. Cambiar el fondo mantiene las capas temáticas.

PNOA cubre España donde el servicio aporta imagen y utiliza siempre Satélite global detrás. Pasar de Oscuro a PNOA no deja el fondo negro: Portugal y otras zonas conservan las imágenes de VersaTiles. La fecha, color y resolución pueden variar entre proveedores.

Cuando una zona no dispone de imágenes detalladas, el visor recorta su parte de una imagen de menor resolución. Esto funciona en 2D y 3D; acercarse no crea detalle que no existe en la fuente.

La transparencia de los PNG permite conservar el fondo en zonas sin imagen. Una zona opaca sin datos no se puede identificar automáticamente como hueco. En «Capas» puedes activar la red hidrográfica y ajustar su opacidad. Para incorporar otros WMS o WMTS, utiliza «Importar»; después aparecerán en Capas o como fondo regional según el uso elegido.

## Relieve y edificios

«Vista 3D» activa una malla de elevaciones Terrarium dibujada por deck.gl. Imágenes, vectores y rutas se adaptan a esa misma superficie. MapLibre controla la cámara y navegación.

En «Fuente de alturas» puedes elegir **Mapterhorn**, que combina elevaciones globales y detalle regional, o **AWS Terrain Tiles**, conservado como alternativa. Si una tesela de detalle de Mapterhorn no existe, se recorta la zona correspondiente de un nivel anterior; no se inventan alturas ni se desplaza el terreno.

La exageración va de 0 a 3: 0 aplana, 1 respeta las alturas del modelo y valores mayores acentúan el relieve. Las capas se dibujan con una copia sin Z propia para evitar calles y ríos flotantes; los originales y exportaciones conservan sus coordenadas. Para analizar y elegir puntos, el visor vuelve a 2D.

Claro y Oscuro utilizan estilos OpenFreeMap en 2D e imágenes OSM transformadas a tonos monocromos en 3D. Cartográfico utiliza Liberty en 2D y cartografía OSM en color en 3D: no son exactamente el mismo diseño. Satélite y el fondo de PNOA utilizan imágenes VersaTiles sin esa transformación. Una capa de teselas independiente permite imágenes detalladas sin aumentar la resolución del modelo de alturas.

La iluminación del terreno es neutra: evita añadir manchas oscuras por iluminación de la malla sobre las fotografías. Las sombras incluidas en la fotografía permanecen. No hay una simulación solar por hora del día.

Activa los edificios opcionales y acércate a una ciudad. Se cargan huellas vectoriales de OpenFreeMap y se extruyen con alturas orientativas de OSM/OpenMapTiles. El visor valida alturas y respeta la base de partes elevadas. La cobertura varía; edificios sin altura válida o marcados `hide_3d` se omiten. Son elementos del fondo y no se cuentan en el análisis.

El terreno es aproximado y la adaptación deck.gl es experimental. No es una reproducción fotogramétrica ni representa correctamente todos los puentes o interiores. Edificios grandes en pendiente pueden deformarse. 3D requiere conexión, WebGL y una GPU compatible.

## Calcular una isócrona

Una isócrona delimita el área aproximada que puedes alcanzar desde un origen en un tiempo.

1. Abre «Isócronas» y busca el origen o márcalo en el mapa.
2. Elige entre 5 y 60 minutos; el valor inicial es 20.
3. Calcula el contorno. Puedes borrarlo o exportarlo como GeoJSON.

Valhalla/FOSSGIS utiliza la red de carreteras de OpenStreetMap. Primero comprueba que exista acceso a carretera a menos de 1 km y después calcula saliendo desde ese acceso. La distancia desde el punto elegido se muestra aparte y no se incluye en el tiempo del contorno.

El contorno puede incluir zonas sin acceso directo y no enumera todas las calles transitables. No calcula autonomía de batería, ida y vuelta ni tráfico en tiempo real. La configuración actual ofrece coche. Si el proveedor está ocupado o no encuentra acceso, el visor muestra el error y permite cambiar el origen.

## Archivos para ampliar estas funciones

- `src/components/MapView.tsx`: selector de fondos, terreno, edificios y dibujo.
- `src/lib/basemaps.ts`: estilos, imágenes Satélite y fondo independiente de PNOA.
- `src/lib/terrainSource.ts`: carga de Mapterhorn, caché y uso de teselas anteriores cuando falta detalle.
- `src/lib/satelliteSource.ts`: imágenes globales y recuperación de cobertura compartida entre 2D y 3D.
- `src/lib/elevation.ts`: copia sin Z y decodificación Terrarium.
- `src/lib/basemapTone.ts`: tonos del fondo 3D.
- `src/lib/buildings.ts`: alturas y geometrías de edificios.
- `src/lib/raster.ts`: definición de PNOA, hidrografía y servicios.
- `src/components/SourcesPanel.tsx`: lista integrada de imágenes y registro desde Importar.
- `src/lib/serviceArea.ts`: acceso a carretera y API de isócrona.
- `src/components/ServiceAreaPanel.tsx`: panel de Isócronas y exportación.

Consulta [APIs y proveedores](PROVEEDORES.md), [estilos y alternativas de relieve](ESTILOS-Y-RELIEVE.md) y [comprobaciones](VERIFICACION.md). La documentación 1.2 acompaña el código local; la versión de Pages depende de su despliegue.
