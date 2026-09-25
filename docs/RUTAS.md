# Rutas y búsqueda de direcciones

## Qué funciona

El panel **Rutas** permite buscar origen y destino, seleccionar uno de los cinco resultados, elegirlos tocando el mapa, intercambiarlos, calcular y limpiar. La línea representa la geometría que devuelve OSRM sobre su red de carreteras. Se muestran metros/kilómetros, duración estimada e indicaciones en español. El punto A es el origen y B el destino. La elección en mapa funciona con ratón o toque; no requiere arrastrar un marcador pequeño.

El servicio configurado es **OSRM público con perfil de coche**. Esta versión no ofrece bicicleta ni caminata: cambiar solamente la palabra `driving` de la URL no garantiza otro medio de transporte, porque cada servidor tiene un grafo preparado para un perfil concreto. La duración no usa tráfico en tiempo real. No se ofrece navegación GPS ni instrucciones de seguridad vial.

Un punto se puede ajustar como máximo a una carretera a **1.000 metros**. OSRM recibe `radiuses=1000;1000`, y el cliente verifica las distancias devueltas. Se informa de los metros entre cada punto elegido y el acceso a la carretera; ese tramo de acceso no se incorpora al recorrido, duración o distancia. Una selección en mar, un monte sin acceso o redes desconectadas puede producir un error. No se dibuja una línea recta como sustituto.

## Proveedores y uso responsable

La búsqueda usa [Photon de Komoot](https://github.com/komoot/photon), con [su API de búsqueda](https://github.com/komoot/photon/blob/master/docs/api-v1.md), sobre datos OpenStreetMap. Solo se consulta al pulsar **Buscar** o Intro. Se conserva una caché en memoria de 30 minutos (hasta 60 consultas); no hay peticiones por cada pulsación del teclado.

Las rutas usan [el servidor de demostración de OSRM](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server), con la [API Route](https://project-osrm.org/docs/v5.24.0/api/) y [condiciones FOSSGIS](https://routing.openstreetmap.de/about.html). El cliente separa solicitudes 1,1 segundos como mínimo por proveedor, aplica un límite de espera de 15 segundos, y mantiene hasta 60 rutas durante 5 minutos en memoria. El navegador envía su referencia de origen. La interfaz incluye la atribución a OpenStreetMap, al buscador y al motor, además del enlace «Corregir el mapa».

Los servidores públicos admiten uso moderado de demostración; no ofrecen disponibilidad garantizada ni están preparados para un despliegue masivo. Los límites del cliente se aplican a la pestaña actual: **no coordinan muchos usuarios o varias pestañas**. Para un sitio con tráfico significativo hay que contratar un servicio, alojar instancias propias o introducir un proxy con caché y límites agregados. Pages puede servir el cliente, pero no ese proxy. No se ejecutan pruebas externas automáticamente en cada compilación para evitar consumo repetido del servicio público.

El texto de búsqueda se envía a Photon y las coordenadas a OSRM. Ambos proveedores pueden registrar las peticiones. Las cachés y los puntos de ruta se pierden al recargar; no se guardan en SQLite ni en la configuración de capas. La búsqueda local existente del mapa sigue siendo independiente.

No se integra el servidor público Nominatim: [su política actual](https://operations.osmfoundation.org/policies/nominatim/) impone condiciones adicionales a aplicaciones generadas y exige una elección deliberada e informada del responsable. Photon permite el uso moderado descrito arriba.

## Archivos que se amplían

- `src/lib/routing.ts`: contratos, proveedores, validación, peticiones, cola, cachés, conversión de indicaciones y unidades.
- `src/components/RoutePanel.tsx`: campos de búsqueda, selección, intercambio, errores, resumen e indicaciones.
- `src/components/RoutePanel.css`: controles y estilos adaptados al panel.
- `src/App.tsx`: conserva origen, destino, ruta y herramienta de selección activa.
- `src/components/MapView.tsx`: recibe los resultados y representa el recorrido con deck.gl.
- `tests/routing.test.mjs`: pruebas deterministas del módulo con respuestas simuladas.

Para usar otra instancia compatible, modifica las dos URL en `ROUTING_SERVICES` de `src/lib/routing.ts`. Un cambio de protocolo también exige adaptar `parseSearchResponse` o `parseRouteResponse`, además de la atribución del panel. Nunca introduzcas una clave secreta en código cliente ni en variables Vite: los archivos publicados son visibles.

```ts
export const ROUTING_SERVICES = {
  geocoderUrl: 'https://mi-servidor.example/photon/api/',
  routingUrl: 'https://mi-servidor.example/osrm/route/v1/driving/',
};
```

El servidor debe devolver HTTPS, JSON compatible y permitir el origen del visor por CORS. Para desarrollar también existe `createRoutingClient({ geocoderUrl, routingUrl })`. Un modo de bicicleta requiere un servicio y grafo adecuados, un selector de perfil, pruebas por modo y actualización de los contratos; no basta con cambiar el texto visible.

## Errores y comprobación

Se distinguen búsquedas vacías, resultados inválidos, `NoRoute`, `NoSegment`, errores HTTP 429/503, fallos CORS/conexión y tiempo de espera. Las peticiones se cancelan al cambiar los puntos o desmontar el panel. Una respuesta antigua no reemplaza una selección posterior. Cambiar un extremo invalida la ruta anterior, de modo que no se asocien unas estadísticas a otros puntos.

Ejecuta en PowerShell:

```powershell
node --test tests/routing.test.mjs
```

Las pruebas usan respuestas simuladas para ser repetibles y cubrir los errores sin depender de Internet. La comprobación externa puntual debe documentarse aparte con fecha, servicio y resultado; no equivale a una garantía futura.

### Resultado de la comprobación real

El 24/09/2026 a las 18:26 UTC se ejecutó `node scripts/check-routing-live.mjs --write`. El registro está en `docs/routing-check.json`:

- Photon respondió HTTP 200 y cinco resultados a la búsqueda «Oviedo, España».
- OSRM calculó Oviedo `[-5.844, 43.362]` → Gijón `[-5.661, 43.535]`: **32.392,1 m, 1.703,2 s, 703 vértices y 30 indicaciones**. Ajustó los accesos 154,62 m y 11,85 m.
- El punto oceánico `[-30, 30]` produjo HTTP 400 y `NoSegment`, que se transformó en el aviso de falta de acceso previsto.
- Con cabecera `Origin` de navegador, ambos servicios devolvieron `Access-Control-Allow-Origin: *`. Se verificó HTTP/CORS; la comprobación visual del visor se registra por separado.
- Los ocho casos de `tests/routing.test.mjs` pasaron el 24/09/2026: geometría y unidades, errores geográficos, búsqueda, parámetros, caché, validación, HTTP/JSON, cancelación/tiempo límite y separación temporal de solicitudes.
