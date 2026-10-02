# Qué funciona y qué falta · versión 1.2

## Implementado

- Capas vectoriales con estilos, visibilidad, orden y opacidad.
- Rectángulo y selección libre por puntos, calculando al cerrar.
- Recuento por intersección, estadísticas y exportaciones.
- Rutas reales en coche y búsqueda de direcciones.
- Isócronas en coche de 5–60 minutos y exportación GeoJSON.
- Terreno deck.gl con capas apoyadas en su superficie e iluminación neutra.
- Claro, Oscuro, Cartográfico, Satélite y PNOA; apoyo satélite de PNOA independiente del tema anterior.
- Relieve Mapterhorn y alternativa AWS; recuperación del nivel disponible sin desplazar la geometría.
- Hidrografía y servicios temáticos integrados en Capas; registro de WMS/WMTS en Importar.
- Edificios opcionales de OpenFreeMap con alturas orientativas validadas.
- Paneles plegables, adaptación a pantallas pequeñas y modos local y estático.

## Límites actuales

- WMS/WMTS y edificios del fondo no aportan entidades al recuento GIS.
- No hay rutas a pie o en bicicleta ni tráfico en tiempo real.
- No hay cuentas ni datos compartidos entre navegadores.
- No se admite cualquier formato, sistema de coordenadas o WMTS.
- El terreno es aproximado y TerrainExtension es experimental. Edificios en pendiente pueden deformarse; no es fotogrametría ni una representación completa de puentes/interiores.
- Las isócronas no miden batería ni garantizan acceso directo a cada punto interior.
- Archivos grandes y 3D pueden ralentizar el navegador; los proveedores necesitan conexión.
- Mapbox se ha investigado y documentado, pero no está integrado.

## Pendiente

Usuarios, base compartida, servicios para más datos, reducir la carga inicial y revisar dependencias. También quedan pruebas en dispositivos táctiles físicos. Consulta [comprobaciones y pendientes](VERIFICACION.md): una función implementada no equivale a una comprobación en todas las GPU o a su publicación en Pages.
