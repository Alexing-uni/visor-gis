# Visor GIS web versión 0 4

Memoria técnica y manual de uso

Edición de 25 de septiembre de 2026

Este documento explica para qué sirve el visor, qué funciones incorpora y cómo modificarlo desde Visual Studio Code. La versión 0.4 permite explorar datos vectoriales, medir una superficie seleccionada, consultar rutas por carretera y combinar los datos con fuentes cartográficas externas. Incluye dos formas de ejecución: una instalación local con Node y SQLite y una publicación estática con almacenamiento en el navegador.

El código fuente y esta memoria forman una base modificable. La aplicación facilita consultas y análisis exploratorios; las medidas aproximadas y los servicios públicos externos no sustituyen un levantamiento topográfico, una plataforma de navegación profesional o una base de datos corporativa.

## 1 Presentación objetivo y utilidad del visor

El visor reúne información geográfica en un mapa interactivo. Una capa contiene entidades de un mismo tipo general: puntos, líneas o polígonos. Cada entidad combina una geometría, que determina dónde se dibuja, con atributos, que explican qué representa. La interfaz permite localizar una capa, cambiar su apariencia, consultar sus atributos y analizar qué entidades coinciden con una zona.

Un ejemplo consiste en abrir los puntos de Chile, dibujar un rectángulo sobre una zona de interés y obtener el número de registros afectados. Otro ejemplo consiste en encuadrar los viales de Asturias y medir la longitud que queda dentro de una selección. Un tercer uso combina una ortofotografía PNOA con la red hidrográfica para reconocer el contexto territorial. Estas dos fuentes se muestran como imágenes; no aportan automáticamente registros para el recuento vectorial.

La herramienta de rutas permite buscar Oviedo y Gijón, elegir resultados concretos y solicitar un recorrido por carretera. La aplicación recibe una geometría de ruta, distancia, duración estimada e indicaciones del proveedor y las presenta junto al mapa. No necesita que las carreteras del recorrido estén en una capa local, porque el cálculo utiliza la red del servicio de rutas.

La organización en herramientas separadas sigue patrones habituales de visores territoriales: capas a un lado, controles del mapa accesibles y paneles de análisis y rutas. Global Nature Watch es una referencia funcional para esta organización; no se incorpora su código ni se atribuyen a este proyecto sus fuentes, modelos o capacidades de análisis global.

## 2 Alcance real de esta primera versión

La entrega identificada como 0.4 actualiza la base existente. Conserva los tres archivos geográficos originales: 9.999 puntos y 399 polígonos en Chile, y 6.233 entidades lineales en Asturias. Sus ubicaciones se mantienen separadas porque así son sus coordenadas. El botón de encuadre de cada capa permite pasar de una región a la otra.

Se dispone de visualización vectorial con deck.gl, edición de estilos y orden de capas, importación de GeoJSON, análisis rectangular, exportaciones y rutas de coche. MapLibre proporciona el mapa base y el relieve. Las fuentes oficiales incluidas son ejemplos de servicios de imagen y necesitan Internet. Las rutas y la búsqueda de direcciones también dependen de servicios externos.

La modalidad local conserva Express y SQLite. La modalidad estática evita llamar a la API local para cargar y personalizar las capas y puede publicarse en GitHub Pages. En esa modalidad las preferencias y las importaciones pertenecen al navegador utilizado; no se comparten entre personas ni entre dispositivos.

No se incluyen edición geométrica, trabajo colaborativo, cuentas de usuario, control de permisos, sincronización de archivos importados, tráfico en tiempo real o cálculos oficiales de precisión. Bicicleta y caminata no se ofrecen como modos operativos porque el servicio configurado está comprobado para coche. Estas limitaciones no impiden usar las funciones implementadas dentro de su alcance.

## 3 Funcionalidades y estado de cumplimiento

La columna de estado describe lo que contiene el proyecto. Las comprobaciones y sus límites se detallan en el apartado 15; implementar una función no equivale a garantizar la disponibilidad continua del proveedor que utiliza.

| Función | Estado en 0.4 | Alcance y límite principal |
| --- | --- | --- |
| Capas vectoriales y atributos | Implementada | deck.gl y geometrías originales normalizadas en memoria |
| Estilos y orden de capas | Implementada | Nombre, visibilidad, colores, grosor, radio y opacidad |
| Selección rectangular | Implementada | Dos esquinas mediante clics o toques; borde incluido |
| Recuentos y estadísticas | Implementada | Entidades por capa y tipo; números finitos y exclusión de identificadores |
| Medición dentro de la selección | Implementada | Recorte de líneas e intersección de polígonos con huecos |
| Resaltado y exportación | Implementada | Resultados JSON y CSV; entidades completas en GeoJSON |
| Rutas reales por carretera | Implementada | OSRM, coche, distancia, duración e indicaciones |
| Bicicleta caminata y tráfico | Fuera del alcance actual | Requieren un proveedor y perfiles adicionales comprobados |
| Paneles y adaptación de pantalla | Implementada | Panel plegable, anchura ajustable en escritorio y selección sobre el mapa |
| Vista 2D y relieve 3D | Implementada con límite | Terreno de MapLibre; capas deck.gl sin adaptación automática a la superficie |
| PNOA e hidrografía oficiales | Implementada | Servicios WMS de imagen con atribución |
| Importación de GeoJSON | Implementada | Archivo o URL directa, separación por tipo y validación |
| Registro WMS y WMTS | Implementada con condiciones | WMS EPSG:3857; WMTS mediante plantilla compatible XYZ |
| Ejecución local y GitHub Pages | Implementada | Backend local o modalidad estática según compilación |
| Datos compartidos y usuarios | Evolución futura | No hay servidor colaborativo ni autenticación |

## 4 Tecnologías y función de cada una

| Tecnología | Función dentro del proyecto | Archivo o zona principal |
| --- | --- | --- |
| React | Compone la interfaz y actualiza paneles cuando cambia el estado | src/App.tsx y src/components |
| TypeScript | Comprueba los contratos de capas, resultados y componentes | src/types.ts y archivos .ts y .tsx |
| Vite | Servidor de desarrollo y compilación de recursos estáticos | vite.config.ts |
| deck.gl | Dibuja entidades, imágenes por teselas, selección y rutas; resuelve interacciones cartográficas | src/components/MapView.tsx |
| MapLibre GL JS | Mapa base, cámara, navegación, escala y terreno | src/components/MapView.tsx |
| Turf | Intersecciones, áreas, distancias y envolventes geográficas | src/lib/analysis.ts |
| Proj4 | Convierte coordenadas de los CRS admitidos a WGS84 | src/lib/geojson.ts |
| Ant Design | Botones, controles deslizantes, avisos y componentes de formulario | src/components |
| Node y Express | Ejecutan la API y sirven la compilación en modo local | server/index.js y server/app.js |
| SQLite de Node | Guarda configuración de las capas originales en modo local | server/database.js |
| IndexedDB | Guarda las capas importadas y preferencias del modo estático | src/lib/storage.ts |
| GitHub Actions y Pages | Compilan, comprueban y publican el sitio estático | .github/workflows |

deck.gl sigue siendo la biblioteca principal de visualización de las capas del proyecto. La integración con MapLibre sincroniza la cámara del mapa y las capas sin sustituir los modelos vectoriales por una implementación cartográfica diferente. Las entidades siguen disponibles como GeoJSON para consultas, análisis y exportación.

TypeScript detecta incompatibilidades antes de compilar, pero no garantiza que una URL externa funcione. Por eso la validación de datos, el tratamiento de errores, las pruebas automatizadas y la comprobación de servicios complementan al compilador.

## 5 Estructura de carpetas y archivos

La carpeta public contiene recursos que se copian a la compilación. La carpeta src contiene la aplicación que ejecuta el navegador. La carpeta server pertenece al backend local y no se ejecuta en GitHub Pages. Los tests verifican lógica y almacenamiento; docs reúne las explicaciones y el Word.

```text
visor-gis/
  src/
    App.tsx                 Organización de herramientas y estado
    main.tsx                Inicio de React
    style.css               Distribución y adaptación de la interfaz
    types.ts                Contratos comunes
    config/defaultLayers.ts Capas iniciales del modo estático
    components/             Paneles y mapa
    hooks/useLayers.ts      Carga y cambios de capas
    lib/                    Datos análisis rutas importación y persistencia
    model/                  Modelos que generan las capas deck.gl
  public/data/              GeoJSON originales
  server/                   API catálogo local y SQLite
  tests/                    Pruebas automatizadas
  scripts/                  Preparación de datos y generación documental
  docs/                     Manuales y memoria Word
  .github/workflows/        Integración continua y GitHub Pages
  package.json              Dependencias y comandos
  package-lock.json         Versiones resueltas de dependencias
  vite.config.ts            Desarrollo y base de recursos
  index.html                Entrada de la aplicación
```

App.tsx une las herramientas. MapView.tsx crea el mapa y las capas deck.gl, recoge selecciones y actualiza la cámara. LayerCard.tsx controla el estilo de una capa. FeaturePopup.tsx presenta los atributos de la entidad pulsada. LocationSearch.tsx permite localizar entradas del catálogo local. AnalysisPanel.tsx, RoutePanel.tsx y SourcesPanel.tsx contienen las operaciones de análisis, rutas y fuentes, respectivamente.

El contrato Layer se declara en src/model/Layer.ts. BaseLayer.ts reúne propiedades y opciones compartidas. PointLayer.ts, LineLayer.ts y PolygonLayer.ts definen las variantes de dibujo y los atributos destacados. createLayer.ts elige el modelo adecuado a partir del tipo de capa. Esta separación permite añadir una capa de datos sin duplicar toda la interfaz.

En src/lib, geojson.ts comprueba y transforma los datos; import.ts diferencia enlaces y prepara importaciones; storage.ts encapsula IndexedDB; environment.ts decide entre modalidad local y estática; raster.ts registra servicios de imagen y construye sus URLs; analysis.ts realiza las mediciones y exportaciones; routing.ts comunica con buscador y motor de rutas; viewport.ts calcula destinos de encuadre; api.ts contiene la lectura JSON de la API.

Los archivos que conviene empezar a modificar son src/config/defaultLayers.ts para el catálogo estático, server/database.js para sus equivalentes locales, src/lib/raster.ts para las fuentes oficiales, src/model para los atributos destacados y src/style.css para la apariencia. El apartado 9 explica cómo hacerlo con ejemplos.

Esta memoria tiene su fuente editable en docs/MEMORIA.md. scripts/generate-docx.py convierte ese contenido en docs/Visor_GIS_0.4.docx con títulos, numeración, tablas y campo de índice. Para regenerarlo de forma opcional necesitas Python con el paquete python-docx; esta dependencia documental no es necesaria para ejecutar el visor. Tras modificar el texto, ejecuta python scripts/generate-docx.py desde la raíz del proyecto y revisa el resultado en Word.

## 6 Flujo de datos y relación entre interfaz mapa capas y backend

En el modo local, useLayers solicita la lista de capas a Express. La API lee sus configuraciones de SQLite y devuelve el GeoJSON correspondiente desde public/data. El navegador valida el archivo, interpreta su CRS y genera una nueva colección en WGS84. El modelo convierte esa colección en una capa deck.gl y MapView la incorpora al mapa.

```text
Interfaz React
    > useLayers > API Express > SQLite y archivos GeoJSON
    > validación y normalización > modelo Layer
    > capa deck.gl > mapa e interacción
```

En la modalidad estática, el catálogo inicial procede de src/config/defaultLayers.ts y los GeoJSON se descargan desde los recursos publicados. IndexedDB recupera las preferencias y las importaciones del usuario. El resto del flujo de normalización, modelos y mapa es compartido con el modo local.

```text
Interfaz React
    > catálogo estático y recursos de GitHub Pages
    > preferencias e importaciones de IndexedDB
    > modelos Layer > deck.gl
```

Al cambiar una opacidad, la interfaz solicita guardar la configuración y actualiza el modelo. Al pulsar una entidad, deck.gl identifica el objeto y React muestra sus atributos. Al dibujar un rectángulo, analysis.ts recibe las colecciones vectoriales normalizadas, calcula el resultado y devuelve las entidades seleccionadas para resaltarlas. El análisis no necesita enviar esas entidades a un servidor.

Las rutas siguen otro circuito: el texto de búsqueda se envía a Photon; las coordenadas elegidas se envían a OSRM; la respuesta se valida y su LineString se dibuja con deck.gl. WMS y WMTS devuelven imágenes por teselas; no pasan por el análisis vectorial. El terreno es una fuente de elevación que usa MapLibre para dar forma al mapa base.

## 7 Procedencia de dependencias importaciones y datos

Las bibliotecas se instalan desde el registro npm mediante los nombres declarados en package.json. package-lock.json fija las versiones efectivamente resueltas. npm.cmd ci reconstruye esa instalación a partir del archivo de bloqueo; no requiere copiar manualmente bibliotecas desde otra aplicación. Los imports relativos, como ./lib/analysis.ts, enlazan módulos propios; los imports como @turf/turf corresponden a paquetes externos.

Los tres datos vectoriales pertenecen al material del proyecto y se conservan como archivos de ejemplo. Su contenido por sí solo no acredita una licencia de redistribución ni permite atribuir con certeza todos sus registros a una institución productora. Los metadatos del proveedor original deberán acompañarlos si se sustituye este uso de ejemplo por una publicación institucional.

| Archivo actual | Entidades | Tipo | CRS de entrada | Ámbito |
| --- | --- | --- | --- | --- |
| public/data/points.geojson | 9.999 | Point | EPSG:31994 | Chile |
| public/data/lines.geojson | 6.233 | MultiLineString con Z | EPSG:4258 | Asturias |
| public/data/polygons.geojson | 399 | Polygon | OGC:CRS84 | Chile |

Las coordenadas que recibe deck.gl están en WGS84 y siguen el orden longitud, latitud. EPSG:31994 se registra como SIRGAS 1995 / UTM zona 19 sur; EPSG:4258 corresponde a ETRS89. La aproximación de datum configurada sirve para visualización. La altura Z se conserva en las líneas originales, pero no se transforma su datum vertical ni se utiliza en las mediciones del análisis. Los atributos mantienen sus valores; no se deducen unidades no documentadas para campos como Pend_1 u Orient_1.

PNOA se consume desde https://www.ign.es/wms-inspire/pnoa-ma con la capa OI.OrthoimageCoverage. La red hidrográfica se consume desde https://servicios.idee.es/wms-inspire/hidrografia con la capa HY.Network. El catálogo src/lib/raster.ts incluye los nombres técnicos, la atribución y un encuadre útil sobre España. La atribución del proveedor debe mantenerse al registrar o reutilizar una fuente.

La búsqueda de rutas utiliza https://photon.komoot.io y los recorridos utilizan https://router.project-osrm.org. Ambos trabajan con información relacionada con OpenStreetMap. El mapa base utiliza OpenFreeMap, con estilos positron y dark en https://tiles.openfreemap.org/styles/positron y https://tiles.openfreemap.org/styles/dark. Su configuración no requiere una clave en este proyecto; no se promete un acuerdo de disponibilidad. El relieve utiliza teselas Terrarium distribuidas a través de AWS. Los servicios no se copian al repositorio: el navegador los consulta por HTTPS cuando se necesitan.

Las referencias técnicas principales son la documentación de deck.gl en https://deck.gl/docs, MapLibre en https://maplibre.org/maplibre-gl-js/docs, Turf en https://turfjs.org/docs, Proj4 en https://proj4js.org y GitHub Pages en https://docs.github.com/en/pages. Estos enlaces sirven para ampliar las funciones; los archivos del proyecto son la referencia de su implementación concreta.

## 8 Guía de uso de capas relieve análisis y rutas

### 8.1 Orientarse y trabajar con capas

Al abrir el visor, utiliza el botón Encuadrar de la capa que quieras explorar. Puntos y geología llevan a Chile; viales lleva a Asturias. Mostrar una capa no desplaza necesariamente la cámara hasta sus datos. Si una capa parece vacía, comprueba su visibilidad, la opacidad y el encuadre antes de concluir que no se cargó.

Cada tarjeta muestra el nombre de la capa, su tipo, el número de registros y el CRS de origen. Puedes renombrarla, activarla o desactivarla, cambiar colores y mover su posición en el orden. El grosor se expresa en píxeles; el radio de puntos también se controla en píxeles. La opacidad se aplica a la capa completa. Las flechas de orden son una alternativa al arrastre, especialmente útil en pantallas táctiles.

Pulsa una entidad para abrir sus atributos. La información procede del GeoJSON y no de una consulta al mapa base. El panel lateral se puede plegar para liberar el mapa. En pantallas grandes se ajusta su anchura y en pantallas pequeñas la selección sigue haciéndose sobre la zona visible del mapa.

### 8.2 Mapa base fuentes oficiales y relieve

Activa la ortofoto PNOA desde las fuentes ráster y encuadra España o una capa situada en Asturias. Activa la hidrografía para superponer su imagen temática. Ajusta la opacidad para comparar las fuentes. La falta de imagen puede deberse al ámbito geográfico, al nivel de zoom, al servicio o a un problema de acceso, y no implica que el vector local haya desaparecido.

La vista 2D sitúa el mapa sin inclinación y es la opción más clara para dibujar selecciones y comparar capas. La vista 3D utiliza inclinación y terreno; el control de relieve cambia su exageración visual. Aumentarlo no altera los datos originales ni la fórmula de medición. El modelo de elevación depende de una descarga externa.

Existe un límite relevante: las capas deck.gl se presentan sobre la cámara del mapa, pero no se adaptan automáticamente a cada cota del terreno. En zonas de pendiente pueden verse separaciones entre el vector y el mapa base. Las medidas siguen calculándose en las coordenadas geográficas y no sobre la superficie 3D. Para análisis planimétrico conviene usar la vista 2D.

### 8.3 Seleccionar y analizar una superficie

Abre Análisis, pulsa Dibujar rectángulo y marca dos esquinas opuestas con clics o toques. El rectángulo utiliza longitudes y latitudes de esas esquinas. En 3D su proyección en pantalla puede no parecer un rectángulo perfecto; su definición geográfica sigue siendo la misma. Borra o reinicia la selección para analizar otra zona.

Se seleccionan las entidades cuya geometría real intersecta el rectángulo, incluido su borde. Una prueba de envolvente acelera el descarte, pero el recuento no se basa únicamente en esa envolvente. Cada Feature cuenta una vez. Una MultiLineString con cinco partes es una entidad y aporta la longitud de todas sus partes interiores; una MultiPoint sigue siendo una entidad aunque contenga varios puntos dentro del área.

El panel muestra el área del rectángulo en km² y hectáreas, el total de entidades, los recuentos por capa y tipo, la longitud de líneas recortadas y la superficie de polígonos intersectados. Los huecos de los polígonos se respetan. Una entidad que solamente toca el borde puede contarse y aportar cero longitud o superficie. Las superficies de entidades superpuestas se suman; no se calcula su unión, de modo que su suma puede ser mayor que el rectángulo.

Las estadísticas incluyen mínimo, máximo, suma y media cuando corresponden a los atributos numéricos finitos. Cada atributo muestra su propio n de valores. Se ignoran nulos, textos numéricos e identificadores. Una heurística por nombre también excluye coordenadas técnicas de celdas, índices y códigos como Riesgo y HasData. Se omiten sumas de pendientes, orientaciones, porcentajes, tasas, temperaturas, cotas, valoraciones y confianza cuando el nombre permite reconocerlos; las orientaciones tampoco reciben una media aritmética, porque necesitarían una media circular. Esta heurística es configurable y no sustituye metadatos del proveedor.

Las estadísticas describen las entidades completas seleccionadas, no un reparto ni una ponderación de sus atributos según el área recortada. La suma solo es útil para cantidades aditivas. Las unidades se mantienen como en la fuente; para atributos sin unidades documentadas el visor no inventa una equivalencia. El código que establece estas reglas se encuentra en src/lib/analysis.ts.

Resultados JSON exporta el criterio, la selección y sus medidas. Resultados CSV genera una tabla con una fila por medida o estadístico. Entidades GeoJSON exporta las geometrías seleccionadas completas en WGS84, sin recortarlas, e incorpora la capa de procedencia. Esta distinción permite conservar los registros originales y utilizar las cifras recortadas para el análisis.

Solo se analizan vectores visibles con opacidad mayor que cero. Las imágenes WMS, WMTS, la ortofoto y el relieve no contienen aquí una colección de entidades consultables. No se generan recuentos de ríos a partir de sus píxeles. Para ese cálculo debes importar una capa vectorial de ríos.

### 8.4 Buscar y calcular una ruta

Abre Rutas. Escribe al menos tres caracteres en origen o destino, realiza la búsqueda y elige uno de los resultados. También puedes activar la selección del extremo correspondiente y tocar el mapa. Intercambiar invierte los extremos. Calcular ruta solicita el recorrido; Limpiar permite comenzar de nuevo. Cambiar un extremo invalida el recorrido anterior para evitar presentar una ruta que ya no corresponde a los puntos.

La ruta mostrada es la geometría entregada por OSRM. Distancia y duración proceden de ese cálculo y las indicaciones se presentan en español. La red vial puede obligar al servicio a acercar el extremo a un punto accesible. La aplicación limita ese ajuste a un kilómetro y muestra la separación cuando corresponde; si no encuentra un acceso admitido o un recorrido, presenta un error.

El perfil disponible es coche. No hay tráfico en tiempo real, predicción de incidencias, navegación con posicionamiento continuo ni perfiles operativos de bicicleta o caminata. El cliente limita la frecuencia de solicitudes a intervalos de al menos 1,1 segundos por servicio, guarda búsquedas en memoria durante 30 minutos y rutas durante 5 minutos, y corta peticiones que superan 15 segundos. Estas medidas no equivalen a una cuota contratada o a una garantía de servicio.

Las búsquedas de direcciones se transmiten a Photon y las coordenadas de los extremos a OSRM. El buscador general del catálogo local es independiente y no necesita ese proveedor. Para un portal con muchos usuarios hay que contratar o alojar servicios adecuados y revisar sus condiciones de uso.

## 9 Cómo importar datos y añadir nuevas capas

### 9.1 Archivo y enlace GeoJSON

Usa la importación de datos para elegir un archivo .geojson o .json que contenga una FeatureCollection. Indica un nombre y el CRS correcto. El límite de importación es 30 MiB por archivo o descarga. Si la colección combina puntos, líneas y polígonos, se separa en capas por tipo conservando los atributos y geometrías múltiples. Los datos importados se guardan en IndexedDB en ambas modalidades.

Para un enlace, utiliza la URL que devuelve el archivo, no la página de una aplicación. Por ejemplo, una dirección terminada en datos/rutas.geojson puede ser importable si su contenido es GeoJSON y permite el acceso del navegador. La dirección de un visor, como https://globalnaturewatch.org/map/, contiene una interfaz y no se convierte en entidades por pegarla en el formulario.

La importación rechaza HTML, JSON incorrecto, estructuras no compatibles, coordenadas no finitas, anillos sin cerrar o discrepancias de CRS. No importa directamente Shapefile ZIP, GeoPackage, KML o CSV. Puedes convertirlos con una herramienta GIS y exportar una FeatureCollection GeoJSON en WGS84. GeometryCollection tampoco forma parte del contrato actual; sus elementos deben convertirse en geometrías simples o múltiples admitidas.

En WGS84 el orden es longitud, latitud: Oviedo está cerca de [-5.84, 43.36]. No confundas ese orden con latitud, longitud. El código admite EPSG:4326, OGC:CRS84, EPSG:4258, EPSG:31994 y EPSG:3857. Este último corresponde a Web Mercator y utiliza metros en la entrada. Para añadir otro CRS modifica canonicalCrs y las definiciones de proj4 en src/lib/geojson.ts y comprueba su transformación con una coordenada conocida.

### 9.2 Registrar un servicio de imagen

WMS recibe peticiones de mapa para una zona, tamaño y CRS y devuelve una imagen. WMTS entrega teselas de una cuadrícula. Ninguno es equivalente a un GeoJSON. En Fuentes ráster se registra la URL, tipo, nombre y atribución; para WMS se añade el nombre técnico de la capa, consultable en GetCapabilities.

El cliente WMS genera GetMap 1.1.1 con SRS EPSG:3857, formato PNG y teselas de 256 píxeles. El servidor debe soportar esa combinación. Para WMTS se requiere una plantilla HTTPS compatible con XYZ en EPSG:3857 y los marcadores {z}, {x} y {y}. No se interpreta automáticamente cualquier documento GetCapabilities ni cualquier TileMatrixSet. Una cuadrícula con identificadores de matriz distintos necesita adaptación en src/lib/raster.ts.

Ejemplo de una fuente permanente en officialSources de src/lib/raster.ts:

```ts
{
  id: 'mi-imagen', name: 'Mi cartografía', type: 'wms',
  url: 'https://servidor.example/wms',
  layers: 'nombre_tecnico_de_capa',
  attribution: 'Entidad productora y licencia',
  visible: false, opacity: 0.8
}
```

Los valores de example son marcadores que debes sustituir por un servicio real. Antes de incorporarlo de forma estable, comprueba su capa, ámbito, atribución, CRS, respuesta GetMap y permiso CORS desde el navegador. Una respuesta HTTP 200 puede contener un mensaje XML de error en vez de una imagen.

### 9.3 Añadir un vector permanente al proyecto

Copia el nuevo archivo en public/data. Añade una configuración a defaultLayers en src/config/defaultLayers.ts para la modalidad estática y una fila inicial equivalente en server/database.js para la modalidad local. Usa un id único, kind point, line o polygon, el nombre de archivo y el CRS real. La importación por interfaz es más rápida para una prueba; el catálogo permanente sirve para que todos los visitantes reciban la capa.

Ejemplo de configuración para un GeoJSON de ríos en WGS84:

```ts
{
  id: 'rios-vector', name: 'Ríos consultables', kind: 'line',
  source: 'rios.geojson', crs: 'EPSG:4326',
  visible: true, stroke: '#007f86', fill: '#007f86',
  width: 2, opacity: 0.9, radius: 4, sort_order: 3
}
```

Los campos anteriores corresponden a LayerConfig en src/types.ts. Para decidir qué atributos destacar en los popups, revisa fields y attributes en src/model/BaseLayer.ts y los modelos concretos. Para cambiar qué nombres se excluyen de las estadísticas, modifica isIdentifierAttribute en src/lib/analysis.ts. Para modificar la representación gráfica general cambia toDeckLayer en el modelo correspondiente.

SQLite usa INSERT OR IGNORE al registrar sus valores iniciales. Añadir un nuevo id incorpora una capa, pero editar los valores iniciales de un id ya existente no reemplaza las preferencias guardadas. Para modificar una instalación existente utiliza los controles de la aplicación o una migración explícita en server/database.js. No borres la base de datos si necesitas conservar preferencias.

### 9.4 Resolver problemas de acceso y formato

Si una descarga funciona al abrir su URL pero falla dentro del visor, revisa CORS en el servidor de origen. GitHub Pages no añade un proxy. El servicio debe aceptar peticiones desde el dominio publicado, o debes descargar el archivo y usar la importación local cuando su distribución lo permita. HTTPS es necesario para evitar bloqueos de contenido mixto en una página HTTPS.

Si los datos aparecen en otro continente, verifica CRS y orden de coordenadas. Si solo falla una capa, revisa su mensaje de error y conserva las demás. Si el navegador no permite guardar, comprueba permisos y espacio de almacenamiento; el sistema informa de los cambios que no pudo persistir. Borrar los datos del sitio o utilizar una sesión privada puede eliminar o limitar las importaciones guardadas.

## 10 Cómo crear otro visor reutilizando esta base

Empieza por una copia del repositorio en una carpeta o repositorio nuevo. Conserva la estructura y las pruebas mientras sustituyes los datos. Cambia el nombre de la aplicación en package.json, index.html y el encabezado de src/App.tsx. Ajusta colores y distribución en src/style.css, y configura la región inicial o los encuadres en App.tsx y MapView.tsx.

Sustituye el catálogo en src/config/defaultLayers.ts y sus equivalentes de server/database.js. Añade tus GeoJSON a public/data y documenta autor, fecha, licencia, CRS, unidades y significado de los atributos. Revisa los campos de los modelos y el catálogo de lugares si las ubicaciones de ejemplo ya no sirven.

Selecciona las fuentes de mapa e imagen en MapView.tsx y src/lib/raster.ts. Elimina del catálogo de ejemplo las que no tengan relación con el nuevo territorio y conserva las atribuciones de las elegidas. Si cambias el proveedor de rutas, adapta src/lib/routing.ts, incluidos formato de respuesta, perfiles, errores y límites; no basta con renombrar un selector de transporte.

Si el nuevo visor se publica bajo otra carpeta de GitHub Pages, verifica la base calculada por Vite y los recursos con staticUrl de src/lib/environment.ts. La base IndexedDB incorpora BASE_URL en su nombre para separar visores situados en distintas subcarpetas del mismo origen. Revisa src/lib/storage.ts y su llamada desde useLayers si necesitas otro criterio de aislamiento. Ejecuta npm.cmd test y compila ambos modos antes de publicar.

Ejemplo de comprobación programática de una zona, sin depender del panel:

```ts
import { analyzeLayers } from './lib/analysis.ts';
const resultado = analyzeLayers(modelos, [-6, 43, -5, 44]);
console.log(resultado.totalCount, resultado.lineLengthKm);
```

## 11 Instalación y ejecución desde Visual Studio Code en Windows

Necesitas Node.js 24 o superior, npm, Git y Visual Studio Code. Node 24 es importante porque el backend usa node:sqlite y las pruebas importan TypeScript directamente. Abre la carpeta del proyecto con Archivo > Abrir carpeta y después Terminal > Nueva terminal, utilizando PowerShell.

Comprueba las herramientas e instala exactamente las dependencias bloqueadas:

```powershell
node --version
npm.cmd --version
git --version
npm.cmd ci
```

Para desarrollar con backend local:

```powershell
npm.cmd run dev
```

El comando inicia Express y Vite. La API escucha por defecto en http://127.0.0.1:3001 y el navegador accede al puerto que indique Vite, habitualmente http://127.0.0.1:5173. Vite reenvía /api a Express durante el desarrollo. Usa Ctrl+C para detener ambos procesos. Si el puerto está ocupado, revisa la dirección real que muestra la terminal.

Para comprobar y servir una compilación local:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd start
```

npm.cmd start sirve dist y la API desde Express. Abre http://127.0.0.1:3001. Si modificas el frontend, vuelve a compilar antes de probarlo con start; el servidor no genera dist automáticamente.

Para trabajar sin backend y reproducir la modalidad de GitHub Pages:

```powershell
npm.cmd run dev:static
```

Para probar la compilación estática:

```powershell
npm.cmd run build:pages
npm.cmd run preview
```

Abre la dirección indicada por preview. No abras dist/index.html con doble clic mediante file://: los módulos y las peticiones de archivos requieren un servidor HTTP. dev:static y build:pages seleccionan --mode static de Vite y cargan .env.static, que fija VITE_STORAGE_MODE=browser. El modo normal usa server; un error de la API no se disfraza como un cambio automático de almacenamiento.

Si PowerShell bloquea npm.ps1, utiliza npm.cmd como en estos ejemplos. Un aviso experimental de SQLite pertenece al módulo de Node y no implica por sí solo un fallo; comprueba el resultado del comando. Si faltan módulos, ejecuta npm.cmd ci desde la carpeta que contiene package-lock.json.

## 12 Despliegue en GitHub Pages

GitHub Pages publica los archivos generados por Vite. No ejecuta server/index.js ni abre server/visor.sqlite. El workflow compila la modalidad browser, sube dist como artefacto de Pages y solicita su publicación. Los vectores originales y los recursos necesarios se incluyen en esa compilación; las importaciones personales permanecen en IndexedDB del visitante.

### 12.1 Crear o utilizar un repositorio

Crea en GitHub un repositorio para el visor o utiliza el repositorio publicado con la entrega. Para una creación nueva con el plan gratuito habitual, un repositorio público permite usar Pages. Si GitHub ya contiene archivos, clónalo primero y copia dentro el proyecto para evitar historiales independientes.

En un repositorio nuevo y vacío, estos comandos se ejecutan desde la carpeta del proyecto. Sustituye USUARIO y REPOSITORIO por los valores reales. Si la carpeta ya contiene Git y un remoto correcto, no repitas init ni remote add; compruébalo con git status y git remote -v.

```powershell
git init
git add .
git commit -m "Publicar visor GIS 0.4"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

El archivo .gitignore excluye node_modules, dist y la base SQLite local. El archivo de bloqueo sí debe subirse. No es necesario publicar dependencias instaladas: GitHub Actions las reconstruye con npm ci. Los archivos que hayas importado por la interfaz no se incorporan al repositorio; para distribuirlos a todos, regístralos en el catálogo permanente.

### 12.2 Configurar y ejecutar Pages

En el repositorio entra en Settings > Pages. En Build and deployment selecciona GitHub Actions como Source. El archivo .github/workflows/pages.yml define el proceso; el workflow de integración continua comprueba el proyecto por separado. Una subida a main ejecuta la publicación y también puede iniciarse desde Actions mediante Run workflow si se necesita repetir.

El trabajo de compilación instala Node, ejecuta las comprobaciones y construye el modo estático. El trabajo de despliegue usa el entorno github-pages y permisos pages: write e id-token: write. Los recursos se publican desde dist, no desde la carpeta de código completa. Esta configuración sigue el modelo de workflows personalizados de GitHub Pages documentado en https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages.

### 12.3 Revisar el resultado y encontrar la dirección

Abre Actions y selecciona la ejecución más reciente. Revisa que los trabajos de comprobación, compilación y despliegue terminen correctamente. Si alguno falla, abre su paso y lee el error antes de repetir. Settings > Pages y el entorno github-pages muestran la dirección publicada. Un repositorio de proyecto suele quedar en https://USUARIO.github.io/REPOSITORIO/; el sitio principal de una cuenta usa una ruta distinta.

La configuración de base de Vite y staticUrl deben conservar esa subcarpeta en los archivos de datos y recursos. El workflow obtiene base_path de actions/configure-pages y lo pasa como VITE_BASE_PATH, por lo que también contempla sitios de usuario y dominios propios. La aplicación usa herramientas dentro de una única página, sin rutas de servidor para cada panel. Comprueba la recarga directa de la URL publicada y que la consola no muestre peticiones a localhost o a /api en modo estático.

Verifica una capa vectorial, una importación, un cambio de opacidad, una recarga del navegador y una fuente externa. El éxito del workflow confirma la construcción y publicación de archivos; no garantiza que Photon, OSRM, WMS o el terreno respondan en ese momento.

### 12.4 Publicar actualizaciones

Modifica los archivos, ejecuta las pruebas y la compilación estática y sube el nuevo commit a main. GitHub Actions reconstruirá el sitio. No edites dist como si fuera el código fuente porque la siguiente compilación reemplazará su contenido.

```powershell
npm.cmd test
npm.cmd run build:pages
git add .
git commit -m "Actualizar capas y herramientas"
git push
```

Si utilizas una rama de trabajo, combina sus cambios con main mediante el procedimiento del repositorio. Para volver a una versión anterior, revierte el commit correspondiente y publica esa reversión. Las preferencias guardadas en el navegador no se reinician automáticamente con cada despliegue.

## 13 Backend y almacenamiento actuales

server/index.js crea Express, abre SQLite y carga el catálogo local de lugares. server/app.js define los endpoints. server/database.js crea y migra la tabla layers conservando las preferencias ya guardadas. La ruta por defecto de la base es server/visor.sqlite; GIS_DATABASE_PATH permite elegir otra. PORT y HOST controlan la escucha del servidor, que por defecto queda restringida a 127.0.0.1.

| Endpoint local | Función |
| --- | --- |
| GET /api/health | Comprobar que la API responde |
| GET /api/layers | Leer configuraciones de capas |
| GET /api/layers/:id/data | Leer el archivo geográfico de una capa registrada |
| PATCH /api/layers/:id | Cambiar propiedades permitidas del estilo y nombre |
| PUT /api/layers/order | Guardar un orden completo sin ids repetidos |
| GET /api/search?q=texto | Buscar en el catálogo local de ubicaciones |

SQLite almacena configuración, no todos los vértices del GeoJSON. La tabla contiene id, name, kind, source, crs, visible, stroke, fill, width, opacity, sort_order y radius. Los archivos vectoriales permanecen en public/data. Las consultas de modificación validan los campos y sus rangos y usan parámetros SQL para los valores.

En el navegador, la base IndexedDB visor-gis-v04 incorpora BASE_URL como sufijo y dispone de almacenes configs e imports. Guarda las capas importadas y la configuración del modo estático; las configuraciones se separan por modo. Los cambios se realizan en transacciones y la interfaz recibe un error si no se pueden persistir. El almacenamiento se asocia al origen web, la subruta del visor y el perfil del navegador. Otro equipo o navegador tendrá un estado diferente. Las importaciones tampoco se suben automáticamente a SQLite cuando se trabaja en modo local.

Las fuentes ráster y sus preferencias se guardan en localStorage con la clave visor-gis:rasters:v1 y son locales a ese navegador y origen web. La anchura del panel, la herramienta abierta, la selección de análisis y la ruta activa son estado de la sesión de la interfaz; no forman un historial compartido. Las exportaciones descargadas son archivos independientes que el usuario debe guardar donde corresponda.

El backend actual está pensado para uso local. Publicarlo para varias personas requiere diseñar autenticación, autorización, validación de cargas, copias de seguridad, límites y sincronización. GitHub Pages puede seguir alojando el frontend si esa API se despliega por separado con HTTPS y CORS adecuado.

## 14 Evolución futura

Una base de datos compartida, por ejemplo PostgreSQL con PostGIS, permitiría conservar geometrías, consultar por zona y ejecutar intersecciones en el servidor. Habría que diseñar tablas, migraciones, índices espaciales, copias de seguridad y una API. Sustituir SQLite por esa base no crea automáticamente usuarios ni sincronización.

Los servicios geográficos pueden aportar WFS u OGC API Features para consultas vectoriales y teselas vectoriales para dibujar grandes volúmenes sin descargar todas las entidades. El servicio WMS existente seguiría sirviendo para imágenes temáticas; el análisis se conectaría a los datos consultables del servicio vectorial. Conviene mantener explícito qué parte de los datos se ha cargado antes de presentar un recuento.

Las cuentas de usuario y grupos permitirían separar proyectos, asignar permisos y compartir resultados. Requerirían un proveedor de identidad o autenticación propia, autorización en el backend y un modelo de propiedad de datos. No deben implementarse solo ocultando botones del frontend.

Para mayor volumen, las mejoras principales serían índices espaciales, trabajo en Web Workers, simplificación controlada, carga por extensión y paginación. El análisis actual recorre los datos del navegador; aunque es apropiado para los ejemplos, millones de geometrías pueden bloquear la interfaz o agotar memoria. Las pruebas de rendimiento deben usar conjuntos representativos antes de fijar un límite de producción.

Otras ampliaciones concretas son perfiles reales de bicicleta y caminata con un servicio adecuado, edición de geometrías, gestión de proyectos, medición sobre el terreno y adaptación de capas deck.gl a la elevación. Estas funciones se distinguen de las ya operativas: selección rectangular, estadísticas, importación, exportación y rutas de coche no son propuestas futuras.

## 15 Pruebas realizadas limitaciones y mejoras pendientes

### 15.1 Comprobaciones reproducibles

Los tests se ejecutan con npm.cmd test. En la validación de esta entrega se han superado 37 pruebas automatizadas. Comprueban normalización de los tres datasets, validación de geometrías y CRS, atributos y símbolos de las capas, operaciones de API, persistencia SQLite, migraciones, análisis, rutas, importación, fuentes y almacenamiento del navegador mediante fake-indexeddb. npm.cmd run build ha superado TypeScript y la compilación de producción local. npm.cmd run build:pages es la comprobación reproducible de la variante estática.

En análisis se verifican puntos en el borde, MultiPoint contado una vez, líneas cuya envolvente cruza la selección pero cuya geometría queda fuera, recorte de segmentos, MultiLineString, huecos de polígonos, MultiPolygon, contactos sin área, estadísticas con valores ausentes y exclusión de ids. Las exportaciones se comprueban sin mutar los datos originales y el CSV neutraliza etiquetas que podrían interpretarse como fórmulas en una hoja de cálculo.

Al analizar las envolventes completas de los datos originales se han obtenido los 9.999 puntos, las 6.233 líneas y los 399 polígonos, sin avisos de intersección o medición. La longitud total de las líneas bajo ese criterio es aproximadamente 616,242 km y la suma de superficies de los polígonos es aproximadamente 17.255,612 km². Son medidas calculadas con el algoritmo descrito, no cifras oficiales de inventario ni áreas disueltas.

Las pruebas de rutas incluyen respuestas válidas e inválidas, puntos sin acceso, ausencia de ruta, errores HTTP, cancelación y tratamiento de resultados. El 24 de septiembre de 2026 se comprobó una solicitud real entre Oviedo y Gijón: OSRM respondió con 32.392,1 metros, 1.703,2 segundos, 703 vértices y 30 indicaciones. Una consulta con un punto oceánico fue rechazada con NoSegment. Estas cifras describen aquella consulta y pueden cambiar al actualizarse la red del proveedor.

También se ha comprobado el recorrido desde la interfaz, con los resultados seleccionados por el buscador: aproximadamente 32,1 km, 29 minutos y 25 indicaciones. El intercambio de origen y destino elimina la ruta antigua. La diferencia con la petición API anterior responde a los puntos concretos elegidos. La interfaz se ha revisado en un navegador con ventanas de escritorio de 1280 por 720 píxeles de tableta de 1024 por 768 píxeles y de móvil de 390 por 844 píxeles. Se importaron cuatro entidades de ejemplo en tres capas y se comprobó su recuperación tras recargar el navegador en la compilación estática.

Para repetir la comprobación de disponibilidad real del buscador y el motor de rutas, utiliza npm.cmd run check:routing. Este comando consulta proveedores externos y se mantiene separado de los tests deterministas: una caída temporal de la red no debe confundirse con una regresión de la lógica local.

El historial de validación de la entrega debe leerse junto con docs/RUTAS.md y el resumen de comprobaciones que acompaña al proyecto. Las verificaciones de servicios externos son observaciones de disponibilidad, no acuerdos de continuidad. Un resultado desde una terminal tampoco sustituye por sí solo una prueba CORS desde la dirección publicada. La integración MapLibre 6 incluye su worker de módulos como recurso de Vite en MapView.tsx. En ese archivo, DeckCompatibleMap adapta la lectura de elevación que espera deck.gl mediante la API pública getCenterElevation(). Esta adaptación sirve para interleaved: false; cambiar a renderizado intercalado exige revisar la integración.

### 15.2 Límites que deben conocerse

Las medidas son geodésicas o esféricas a partir de WGS84 y no incorporan altura. El rectángulo no admite cruzar el antimeridiano ni abarcar más de 180 grados de longitud. La importación comprueba estructura y coordenadas pero no repara toda topología inválida. Si una intersección falla, se notifica; si falla una medición, la métrica se marca como no disponible, sin inventar un cero.

Los datos originales y las importaciones se descargan completos, por lo que el tamaño, número de vértices y capacidad del navegador influyen en rendimiento. La opacidad y visibilidad determinan qué vectores entran en el análisis. Las imágenes oficiales aportan contexto cartográfico, no recuentos de entidades. Las áreas superpuestas y segmentos coincidentes se suman por registro.

Las rutas de demostración dependen de Internet, cobertura de la red y límites del proveedor. La estimación no incluye tráfico en tiempo real y los extremos pueden ajustarse a accesos cercanos. La persistencia estática depende del almacenamiento del navegador y no equivale a una copia de seguridad. El relieve es visual y las capas no se adaptan automáticamente a sus cotas.

La auditoría npm registra 11 avisos transitivos, 3 moderados y 8 altos. La actualización a MapLibre 6.11.2 elimina el aviso crítico de su sanitizador. Quedan pendientes los avisos de dependencias de carga y compresión; no se ha forzado una degradación de deck.gl. Vite avisa también de un paquete principal grande. Los detalles reproducibles están en docs/VERIFICACION.md.

### 15.3 Verificaciones que requieren un entorno adicional

La publicación se realiza en el repositorio Alexing-uni/visor-gis. GitHub Actions está seleccionado como origen de Pages y el workflow compila la modalidad estática al recibir cambios en main. Consulta Actions para conocer el resultado de cada despliegue y la dirección que muestra Pages para verificarlo. La guía del apartado 12 permite repetir el proceso.

La revisión de tamaños de ventana se ha realizado y evalúa la distribución visual, pero no certifica todos los gestos, GPUs y navegadores. No se han usado un teléfono y una tableta físicos. El funcionamiento publicado debe verificarse desde la URL que muestre GitHub Pages una vez termine su despliegue.

El Word contiene estilos de título y un campo de índice actualizable. En Microsoft Word, pulsa con el botón derecho sobre el índice y elige Actualizar campo y Actualizar toda la tabla después de editar el contenido. La paginación definitiva depende del motor de Word y de las fuentes disponibles. Se ha comprobado la estructura del archivo, sus 15 apartados, tablas, títulos, enlaces, índice y campos de página. La conversión a imágenes para revisión visual no pudo realizarse porque el entorno no dispone del ejecutable de renderizado LibreOffice soffice.exe. La revisión visual página por página queda pendiente al abrirlo en Word; no se presenta como completada.

Las prioridades de continuación son comprobar la interfaz con dispositivos reales, observar los servicios desde el dominio publicado, registrar metadatos y licencias de nuevas capas y decidir si el siguiente crecimiento requiere un backend compartido. El proyecto entrega los archivos y separa esas verificaciones de las funciones que ya existen en el código.



