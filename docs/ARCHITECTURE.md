> Documento histórico de la versión anterior. Para el estado actual consulta [MEMORIA.md](MEMORIA.md) y [VERIFICACION.md](VERIFICACION.md).

# Arquitectura y recorrido del programa

## 1. Arranque

`npm run dev` ejecuta Vite y `server/index.js` mediante concurrently. Vite sirve React y envía `/api` al backend en el puerto 3001. El backend abre SQLite y atiende Express. `npm start` sirve la API y, si se ha ejecutado `npm run build`, los archivos compilados de `dist`.

## 2. SQLite y API

`server/database.js` contiene la creación de tabla, los valores iniciales y la migración desde la versión anterior. La nueva columna `radius` separa el tamaño de los puntos del grosor del borde. Los ajustes existentes se conservan. Los nombres iniciales de demostración se actualizan solo si siguen siendo exactamente los originales.

La tabla `layers` guarda id, nombre, tipo, archivo, CRS, visibilidad, colores, grosor, opacidad, orden y radio. No guarda geometrías: esas siguen en GeoJSON.

`server/app.js` define:

| Método y ruta | Función |
| --- | --- |
| GET /api/layers | Configuración ordenada de las capas. |
| GET /api/layers/:id/data | Contenido del archivo GeoJSON de una capa. |
| PATCH /api/layers/:id | Validar y guardar un cambio de estilo o nombre. |
| PUT /api/layers/order | Validar y guardar el orden completo en una transacción. |
| GET /api/search?q=... | Sugerencias del catálogo geográfico local. |
| GET /api/health | Confirmar que el servidor responde. |

El servidor escucha en 127.0.0.1 por defecto. PORT, HOST y GIS_DATABASE_PATH son variables opcionales para desarrollo o pruebas. Este prototipo no incorpora usuarios ni autenticación.

## 3. Entrada del frontend

`src/main.tsx` monta React y configura Ant Design en español. `src/App.tsx` organiza el panel y el mapa; gestiona la selección y el encuadre. `src/style.css` contiene la presentación adaptable a la pantalla.

## 4. Carga

`src/hooks/useLayers.ts` solicita primero las definiciones de capa. Carga cada GeoJSON en paralelo con errores separados, valida, transforma y crea el modelo apropiado. Usa AbortController para cancelar cargas cuando se desmonta la interfaz. Las escrituras a la API se serializan para respetar el orden de los cambios. Se muestra el estado de guardado y cualquier error.

## 5. Validación y CRS

`src/lib/geojson.ts` valida datos y geometrías, reconoce las declaraciones CRS antiguas del GeoJSON y contrasta el origen con la configuración. Normaliza XY a EPSG:4326 sin modificar los originales ni transformar los atributos. Conserva las coordenadas adicionales, incluida la Z de las líneas. El resultado no conserva el CRS o bbox antiguos.

## 6. Modelo pedido por el PDF

`src/model/Layer.ts` define la interfaz de comportamiento y ColorConfig. BaseLayer implementa operaciones comunes: nombre, bounds, colores, atributos y opciones del renderizador. PointLayer, LineLayer y PolygonLayer añaden los estilos y la selección de campos propios de cada geometría. `createLayer.ts` elige la clase a partir de `kind`.

El tipo `LayerConfig` representa lo almacenado en la API. Una instancia del modelo `Layer` añade datos, bounds y comportamiento. `GeoJsonLayer` es el objeto gráfico creado por el modelo para DeckGL.

El diagrama del PDF indica RGBarray para borderWidth; aquí se utiliza un número, ya que representa un grosor, no un color.

## 7. Mapa

`src/components/MapView.tsx` crea MapLibre y un MapboxOverlay de DeckGL. El overlay toma la cámara de MapLibre. Los modelos generan GeoJsonLayer con radios y grosores en píxeles y opacidad para toda la capa. Se desactiva la prueba de profundidad entre estas capas para respetar su orden visual.

La vista inicial se encuadra sobre los puntos de Chile. Cada tarjeta permite encuadrar su dataset. Las líneas se encuentran en Asturias. Un fondo sin cartografía permite trabajar con las entidades cuando no está disponible el proveedor de mapas.

El cambio 2D/3D modifica pitch entre 0 y 55 grados. El bloqueo de giro afecta a ratón, gesto táctil y teclado; la brújula rotatoria nativa se sustituye por un botón Norte desactivado durante el bloqueo.

## 8. Edición de capas

`LayerCard.tsx` muestra una configuración. Los sliders tienen un valor temporal durante el arrastre y guardan al terminar. Al recibir la respuesta, el hook actualiza la configuración y el modelo regenera su capa gráfica. Las tarjetas se ordenan con su asa de arrastre o con flechas. El panel lista arriba la capa visualmente superior.

## 9. Selección

DeckGL detecta el clic y entrega una Feature. `FeaturePopup.tsx` muestra únicamente los campos permitidos por su modelo y omite valores nulos. La cabecera permite arrastrar el panel; el movimiento del mapa lo cierra. El popup se mantiene dentro del área visible.

## 10. Búsqueda

`LocationSearch.tsx` pide sugerencias a la API local. El catálogo incluye las tres zonas de datos y dos centros, con cinco resultados posibles. No es un geocodificador mundial. `viewport.ts` comprueba si hay bounds y permite encuadrar; si solo hay centro, utiliza flyTo.

Se ha retirado el autocompletado contra la API pública de Nominatim. Un servicio geográfico corporativo puede conectarse después manteniendo el contrato `Place`: id, label, center y bounds opcional. `npm run data:catalog` regenera los centros y bounds a partir de los GeoJSON actuales; los nombres y palabras de búsqueda se configuran en `scripts/update-places.mjs`.

## 11. Pruebas y GitHub

`tests/geojson.test.mjs` comprueba los datos reales, la validación, la transformación, los símbolos y ambos tipos de resultado geográfico. `tests/api.test.mjs` comprueba peticiones, persistencia y migración. GitHub Actions ejecuta npm ci, npm test y npm run build.

`package-lock.json` fija las dependencias. `.gitignore` excluye SQLite, node_modules y dist. No excluye los GeoJSON de este proyecto: están incluidos en el paquete para que pueda ejecutarse.

