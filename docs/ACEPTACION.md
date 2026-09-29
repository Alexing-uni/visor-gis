# Qué funciona y qué falta en la versión 1.1

## Implementado

- Capas vectoriales con estilos, visibilidad y opacidad.
- Rectángulo y selección libre por puntos, con cálculo al cerrar.
- Recuento por intersección, estadísticas y exportaciones.
- Rutas reales en coche y búsqueda de direcciones.
- Alcance en coche de 5 a 60 minutos y exportación GeoJSON.
- Terreno deck.gl con capas adaptadas a la superficie.
- Fondos regionales con cartografía visible fuera de cobertura, PNOA e hidrografía.
- Importación GeoJSON y fuentes de imágenes compatibles.
- Paneles plegables y adaptación a pantallas pequeñas.
- Modo local con backend y modo estático para GitHub Pages.

## Límites actuales

- Las imágenes WMS/WMTS no aportan entidades al análisis.
- No hay rutas a pie o en bicicleta ni tráfico en tiempo real.
- No hay cuentas de usuario ni datos compartidos entre navegadores.
- No se admite cualquier formato, sistema de coordenadas o WMTS.
- El terreno es aproximado y su extensión es experimental; no modela edificios ni puentes.
- El alcance no mide batería ni garantiza acceso a cada punto interior.
- Los archivos grandes pueden ralentizar el navegador.
- La versión 1.1 se entrega en `main`; la disponibilidad del sitio depende de que GitHub Actions complete el despliegue.

## Pendiente

La evolución prevista incluye usuarios, una base compartida y servicios adecuados para más datos. También queda probar dispositivos táctiles físicos y resolver los avisos pendientes de dependencias. Consulta las [pruebas y sus límites](VERIFICACION.md).
