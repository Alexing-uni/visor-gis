# Visor GIS web · versión 0.4

Informe resumido

Este documento explica para qué sirve el visor, cómo está construido y qué permite hacer actualmente. Código: https://github.com/Alexing-uni/visor-gis

## 1. Objetivo y alcance

El visor permite consultar datos geográficos desde el navegador. Sirve, por ejemplo, para localizar elementos de una capa, contar los que afectan a una zona o consultar un recorrido por carretera.

Esta versión es una base funcional para aprender y ampliar un proyecto GIS. Incluye datos de Chile y Asturias, herramientas de análisis e importación y publicación web. No sustituye a un programa completo de edición geográfica ni a una plataforma de trabajo compartido.

## 2. Tecnologías y por qué se utilizan

| Tecnología | Función y motivo de uso |
| --- | --- |
| React y TypeScript | Organizan los paneles y sus datos. Los componentes se reutilizan y los tipos ayudan a detectar errores. |
| Vite | Ejecuta el proyecto durante el desarrollo y genera los archivos de la web publicada. |
| deck.gl | Es la biblioteca principal del mapa: dibuja las capas, selecciones y rutas utilizando la tarjeta gráfica. |
| MapLibre | Aporta el mapa base y el relieve. Complementa a deck.gl. |
| Turf y proj4 | Turf calcula intersecciones, áreas y longitudes. proj4 transforma las coordenadas a un sistema común. |
| Ant Design y CSS | Aportan controles y permiten adaptar los paneles al tamaño de pantalla. |
| Express y SQLite | El servidor local ofrece una API; SQLite guarda la configuración en un archivo, sin instalar otro servidor de base de datos. |
| IndexedDB y localStorage | Guardan información en el navegador. Permiten usar GitHub Pages sin backend. |
| GitHub Actions | Ejecuta las pruebas, compila y publica las actualizaciones. |

Las bibliotecas se obtienen de npm. `package.json` declara las dependencias y `package-lock.json` fija las versiones instaladas. Las importaciones del código conectan esas bibliotecas y los módulos propios.

## 3. Estructura y funcionamiento

Las partes principales son:

- `src/App.tsx`: conecta el estado de la aplicación con los paneles.
- `src/components/`: contiene la interfaz. `MapView.tsx` controla el mapa y las interacciones.
- `src/lib/`: contiene los cálculos, las rutas, la importación y el almacenamiento.
- `src/model/`: define las capas y los atributos que se muestran.
- `src/config/defaultLayers.ts`: configura las capas iniciales del modo estático.
- `public/data/`: contiene los archivos geográficos.
- `server/`: contiene la API y la configuración SQLite del modo local.
- `tests/`, `docs/` y `.github/workflows/`: pruebas, documentación y publicación.

El navegador carga la configuración y después los archivos GeoJSON, que contienen geometrías y atributos. Si hace falta, transforma las coordenadas. deck.gl representa las entidades y MapLibre dibuja el fondo. Al seleccionar una zona, los cálculos se realizan en el navegador y el panel presenta los resultados.

En modo local, Express y SQLite guardan los ajustes de las capas originales; las geometrías siguen en archivos. En Pages, esos ajustes se guardan en IndexedDB. Las importaciones usan IndexedDB en ambos modos y las preferencias de imágenes usan localStorage. Estos datos del navegador no se comparten y pueden perderse al borrar los datos del sitio.

## 4. Herramientas implementadas

**Capas y relieve.** Se pueden mostrar u ocultar capas, cambiar estilos y regular la opacidad. Los paneles son plegables y ajustables en pantallas grandes. La vista 3D permite cambiar la exageración del terreno; las capas deck.gl no se adaptan a su superficie. Para analizar o elegir puntos se utiliza la vista 2D.

**Análisis.** Se puede dibujar un rectángulo o elegir Libre por puntos. En el modo libre hay que marcar al menos tres vértices y cerrar la figura pulsando el primero o Cerrar y analizar. No se calculan resultados mientras esté abierta. Se pueden deshacer puntos, cancelar y repetir.

Se cuentan los registros cuya geometría intersecta o toca la selección. Cada entidad cuenta una vez, también si tiene varias partes. Los duplicados en distintas capas cuentan por separado. Solo participan capas vectoriales visibles con opacidad mayor que cero; las imágenes no se cuentan.

El panel muestra superficie, recuentos, longitudes y áreas interiores, además de estadísticas de atributos numéricos cuando tienen sentido. Los atributos corresponden a la entidad completa, no se reparten según la parte seleccionada. Las superficies superpuestas se suman. Los resultados se exportan en JSON o CSV; también se pueden exportar las entidades completas en GeoJSON.

El cálculo está en `src/lib/analysis.ts`; la interfaz, en `AnalysisPanel.tsx` y `MapView.tsx`, dentro de `src/components/`.

**Rutas.** Se buscan origen y destino o se marcan en el mapa. Se pueden intercambiar, calcular y limpiar. Photon busca direcciones y OSRM calcula un recorrido real en coche, con distancia, tiempo estimado e indicaciones. No hay tráfico en tiempo real ni modos a pie o en bicicleta. Si falla el servicio o no existe acceso, se informa del problema. Código: `src/lib/routing.ts` y `src/components/RoutePanel.tsx`.

## 5. Datos, importación y ampliación

Se conservan los datos originales: 9.999 puntos de Chile, 6.233 líneas de Asturias y 399 polígonos de Chile. Proceden de la versión anterior; conviene comprobar sus permisos antes de redistribuirlos para otros usos. `example-import.geojson` contiene cuatro entidades ficticias para practicar.

PNOA del IGN e hidrografía de IGN/IDEE se cargan como imágenes WMS. Sirven de referencia visual, pero no permiten contar sus objetos. El fondo usa OpenFreeMap y el relieve, teselas Terrarium alojadas en AWS. Se deben conservar las atribuciones.

Se admite GeoJSON desde archivo o enlace directo, hasta 30 MiB, con puntos, líneas y polígonos simples o múltiples. Los sistemas de coordenadas admitidos son EPSG:4326, 4258, 3857 y 31994. Una página web con un visor no es un archivo importable. WMS y las plantillas WMTS compatibles se añaden como fuentes de imágenes. Otros formatos requieren conversión previa.

Para añadir una capa permanente, copia el archivo a `public/data/` y duplica una entrada en `src/config/defaultLayers.ts`. Cambia nombre, archivo, tipo, coordenadas y estilo. Por ejemplo, estos valores de una entrada controlan su apariencia:

```typescript
fill: '#4caf50',
stroke: '#245c28',
opacity: 0.6,
```

Añade también la configuración inicial equivalente en `server/database.js`. Una SQLite existente conserva sus ajustes: los nuevos valores iniciales no la actualizan automáticamente. Los atributos visibles se ajustan en `src/model/`; las fuentes de imágenes, en `src/lib/raster.ts`.

Para crear otro visor, sustituye los datos y configuraciones, cambia los textos de la interfaz y revisa las atribuciones. Si una URL falla, comprueba que devuelve datos y permite acceso desde el navegador mediante CORS. Usa HTTPS o importa un archivo descargado cuando corresponda.

## 6. Instalación y publicación

En Windows, instala Node.js 24 y abre la carpeta con Visual Studio Code. En PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre http://127.0.0.1:5173. El backend local utiliza el puerto 3001. Para detenerlo, pulsa Ctrl+C. Detén los servidores antes de reinstalar dependencias. `npm.cmd run dev:static` permite probar el modo sin backend.

Para publicar, sube el proyecto a un repositorio de GitHub. En Settings → Pages, elige GitHub Actions como origen. El workflow `.github/workflows/pages.yml` prueba y compila la modalidad estática, configura la ruta base y publica al actualizar `main`. Comprueba el resultado en Actions; la dirección aparece en Pages y en el despliegue.

Para futuras actualizaciones:

```powershell
npm.cmd test
npm.cmd run build:pages
git add .
git commit -m "Actualizar el visor"
git push
```

La guía `docs/PAGES.md` explica la configuración inicial. La publicación actual está en https://alexing-uni.github.io/visor-gis/. Pages no ejecuta Express ni SQLite: los cambios del usuario permanecen en su navegador. Para compartir datos se necesitaría un backend externo.

## 7. Pruebas y estado de cumplimiento

Se han comprobado la instalación, las compilaciones local y estática, el almacenamiento y 42 pruebas automáticas. La revisión independiente del recuento coincidió en 45 casos con Shapely/GEOS, incluyendo formas libres y contactos con el borde. Los detalles están en `docs/RECUENTO.md`.

También se comprobaron rutas reales, fuentes externas y ventanas de ordenador, tableta y móvil. Estas pruebas no garantizan la disponibilidad futura de servicios externos. No se probó el uso táctil en dispositivos físicos.

| Estado | Funciones |
| --- | --- |
| Implementado | Capas, relieve, selección rectangular y libre, estadísticas, exportación, rutas en coche, importación y Pages. |
| Con límites | Fuentes externas, formatos de importación, grandes archivos y representación de capas sobre el terreno. |
| No implementado | Usuarios, almacenamiento compartido, tráfico y rutas a pie o en bicicleta. |

El Word se comprueba en contenido y estructura; queda pendiente la revisión visual de sus páginas por falta de un renderizador disponible. La auditoría del 25 de septiembre dejó 11 avisos transitivos de dependencias pendientes de revisión. El detalle de las comprobaciones está en `docs/VERIFICACION.md`.

## 8. Mejoras futuras

El siguiente paso sería añadir un backend compartido, usuarios y una base como PostgreSQL/PostGIS. Para conjuntos mayores convendría servir solo los datos necesarios mediante servicios geográficos o teselas vectoriales, en vez de descargar archivos completos.

También queda mejorar la carga inicial, revisar dependencias y probar móviles reales. Son posibles ampliaciones; no se presentan como funciones que ya estén disponibles.
