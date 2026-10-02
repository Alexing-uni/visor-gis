# Mapa base y servicios · versión 1.2

«Mapa y relieve» reúne **Claro, Oscuro, Cartográfico en color, Satélite global y Ortofoto PNOA**, además de «Sin fondo» y fondos regionales registrados. PNOA utiliza imágenes globales fuera de su cobertura aunque antes estuviera elegido Oscuro. No existe un panel de navegación separado «Fuentes».

«Capas» contiene la red hidrográfica de IGN/IDEE y los servicios temáticos añadidos. Usa «Importar» para registrar un WMS o WMTS compatible. WMS devuelve imágenes, por lo que no permite contar automáticamente ríos u otros objetos. Los edificios del fondo tampoco se incluyen en los análisis GIS.

En 2D se utilizan estilos OpenFreeMap y las imágenes de VersaTiles; en 3D, terreno deck.gl con Mapterhorn o AWS. Claro/Oscuro usan textura OSM monocroma; Cartográfico, OSM en color; Satélite, imágenes VersaTiles. PNOA conserva sus colores. Los niveles de alturas o imágenes ausentes reutilizan la zona correspondiente de un nivel anterior. Las atribuciones deben mantenerse al reutilizar el proyecto.

Para registrar un servicio fijo, edita `src/lib/raster.ts`, siguiendo una entrada existente: URL, nombre técnico de capa, atribución, uso y cobertura. Comprueba HTTPS, CORS y coordenadas. Una página con un visor no es un servicio importable.

La guía completa está en [Mapa, relieve e isócronas](ISOCRONAS-Y-3D.md). Las URLs, procedencia y condiciones están en [APIs y proveedores](PROVEEDORES.md); las comprobaciones, en [Verificación](VERIFICACION.md).
