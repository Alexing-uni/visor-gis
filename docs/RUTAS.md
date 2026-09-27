# Calcular una ruta

1. Abre **Rutas** y busca el origen y el destino, o selecciónalos pulsando sobre el mapa.
2. Calcula la ruta. Verás el recorrido, la distancia, el tiempo estimado y las indicaciones.
3. Puedes intercambiar los extremos, limpiar la ruta y calcular otra.

La búsqueda de direcciones usa **Photon** y el recorrido usa **OSRM**, sobre la red de carreteras de OpenStreetMap. La versión actual ofrece únicamente **coche**. No incluye tráfico en tiempo real, bicicleta ni caminata.

Los servicios públicos pueden fallar o limitar las peticiones. Si no aparece una dirección, prueba con municipio y calle. Si un punto está lejos de una carretera accesible o no hay conexión entre ambos extremos, cambia su posición. El visor muestra el error; no sustituye el recorrido por una línea recta.

La búsqueda del catálogo de capas es distinta de la búsqueda de direcciones de esta herramienta. Las direcciones y coordenadas solicitadas se envían al proveedor correspondiente.

Código: `src/lib/routing.ts`, `src/components/RoutePanel.tsx` y `src/components/MapView.tsx`. Para comprobar el servicio: `npm.cmd run check:routing`.
