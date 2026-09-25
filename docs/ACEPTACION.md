> Documento histórico de la versión anterior. Para el estado actual consulta [MEMORIA.md](MEMORIA.md) y [VERIFICACION.md](VERIFICACION.md).

# Comprobación de requisitos

## Resultado automatizado

Se han ejecutado las seis pruebas de `npm test` y la compilación `npm run build`. Se han verificado los 16.631 elementos recibidos, sus CRS y geometrías, el radio de puntos en píxeles, el filtrado de propiedades, los resultados geográficos con y sin bounds, los cambios de configuración, la persistencia al reabrir SQLite y la migración desde la versión anterior.

La comprobación visual final queda pendiente: el navegador remoto disponible bloquea la URL del servidor local. No se afirma haber probado el render WebGL ni las interacciones visuales en un navegador real de Windows.

## Hitos del PDF y prueba manual

| Hito | Implementación | Qué comprobar en tu navegador |
| --- | --- | --- |
| 1. Visor mínimo | MapLibre y overlay DeckGL | Abre el visor; desplaza el mapa y usa los botones de zoom. |
| 2. Datos locales | Tres GeoJSON reales con carga independiente | Deben aparecer 9.999 puntos, 399 polígonos y 6.233 polilíneas, sin alertas de datos. |
| 3. CRS | 31994 y 4258 registrados; CRS84 compatible | Chile debe contener puntos y polígonos. Encuadra Viales para ir a Asturias. |
| 4. Capas vectoriales | Modelos PointLayer, LineLayer y PolygonLayer | Comprueba que se dibujan puntos, líneas y polígonos. Oculta una capa y vuelve a mostrarla. |
| 5. Panel | Nombre, colores, radio, grosor, opacidad, orden y encuadre | Cambia cada control y recarga: el ajuste debe conservarse. Prueba flechas y arrastre por ⠿. |
| 6. Features | Popup con campos por capa, arrastre y cierre al mover | Pulsa una entidad, arrastra la cabecera y mueve el mapa para cerrarlo. |
| 7. Búsqueda | Catálogo local con cinco ubicaciones | Busca Chile o Asturias. Prueba una zona y un centro; el campo debe limpiarse al seleccionar. |
| 8. Cámara | 2D/3D, bloqueo de ratón/táctil/teclado, mapas base | Cambia perspectiva y fondo. Bloquea giro y prueba Shift+flechas con el mapa enfocado. |

El buscador no ofrece cobertura mundial. La precisión de transformación es la de visualización documentada en DATOS.md. Las líneas conservan Z pero no se añade relieve. Estos límites son explícitos y deben confirmarse con el tutor si espera un alcance mayor.

## Si falta el fondo del mapa

Claro y Oscuro necesitan acceso al proveedor CARTO. Selecciona Sin fondo para verificar las geometrías locales. Esto permite distinguir un fallo de red del mapa base de un problema de los datos.

