# Qué funciona y qué falta

## Implementado

- Capas vectoriales con estilos, visibilidad y opacidad.
- Rectángulo y selección libre por puntos, con cálculo al cerrar.
- Recuento por intersección, estadísticas y exportaciones.
- Rutas reales en coche y búsqueda de direcciones.
- Mapa base, relieve, PNOA e hidrografía como imágenes.
- Importación GeoJSON y fuentes de imágenes compatibles.
- Paneles plegables y adaptación a pantallas pequeñas.
- Modo local con backend y modo estático para GitHub Pages.

## Límites actuales

- Las imágenes WMS/WMTS no aportan entidades al análisis.
- No hay rutas a pie o en bicicleta ni tráfico en tiempo real.
- No hay cuentas de usuario ni datos compartidos entre navegadores.
- No se admite cualquier formato, sistema de coordenadas o WMTS.
- Las capas no se ajustan al terreno 3D y los archivos grandes pueden ralentizar el navegador.

## Pendiente

La evolución prevista incluye usuarios, una base compartida y servicios adecuados para más datos. También queda probar dispositivos táctiles físicos y resolver los avisos pendientes de dependencias. Consulta las [pruebas y sus límites](VERIFICACION.md).
