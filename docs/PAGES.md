# Publicar el visor con GitHub Pages

## 1. Qué se publica y qué se guarda

El mismo código dispone de dos modalidades. `npm.cmd run dev` inicia Vite y la API Express local; las configuraciones originales se guardan en `server/visor.sqlite`. `npm.cmd run dev:static` ejecuta el visor sin API; `npm.cmd run build:pages` genera esa modalidad estática en `dist/`.

En Pages los GeoJSON originales y el catálogo de búsqueda proceden de `public/data/`, incluidos como archivos públicos en la compilación. Los estilos, nombres, visibilidad y orden de las capas se guardan en IndexedDB. Las importaciones GeoJSON también se guardan en IndexedDB, tanto en modalidad local como estática. Las entidades originales siguen en sus archivos, no en SQLite. Las rutas y los análisis calculados pertenecen a la sesión y pueden exportarse donde la interfaz ofrece esa opción.

IndexedDB pertenece a ese navegador, perfil y origen; la base usa además la ruta base del proyecto para separar distintos visores alojados en un mismo dominio. No sincroniza ordenadores ni usuarios. Cambiar entre `localhost` y `127.0.0.1`, otro puerto o el sitio publicado crea un almacenamiento distinto. Borrar los datos del sitio o usar navegación privada puede eliminarlo. Los cambios solo aparecen como guardados después de terminar su transacción; los errores de cuota o permisos se muestran en pantalla. Conserva los archivos importados originales.

Pages sirve HTML, JavaScript, CSS y archivos: no ejecuta Express ni SQLite. Para datos compartidos, autenticación, edición colaborativa, permisos o claves privadas hace falta desplegar una API adicional. La modalidad estática conserva las herramientas de mapa, análisis y rutas; las fuentes externas siguen necesitando conexión y permitir acceso desde el navegador.

## 2. Archivos que controlan el despliegue

| Archivo | Función |
| --- | --- |
| `.env.static` | Activa `VITE_STORAGE_MODE=browser` al compilar con `--mode static`. |
| `vite.config.ts` | Lee `VITE_BASE_PATH`; valor predeterminado `/`. |
| `src/lib/environment.ts` | Selección explícita de almacenamiento y construcción de URLs de recursos con `BASE_URL`. |
| `src/config/defaultLayers.ts` | Catálogo y estilos iniciales de las capas originales para Pages. |
| `src/hooks/useLayers.ts` | Carga y edición mediante API o IndexedDB según la modalidad. |
| `src/lib/storage.ts` | Persistencia de estilos, orden e importaciones en IndexedDB. |
| `public/data/places.json` | Catálogo local de búsqueda del sitio estático. |
| `.github/workflows/ci.yml` | Instala, ejecuta pruebas y compila el modo local. |
| `.github/workflows/pages.yml` | Instala, prueba, compila la modalidad estática y publica `dist/`. |

No se necesita un enrutador de URL ni un `404.html` de redirección: la aplicación se sirve en una única página y sus paneles son estado de React. Vite corrige las rutas de JavaScript y CSS, y `staticUrl()` corrige las de GeoJSON y catálogo. No escribas `/data/archivo.geojson` al añadir fuentes internas: utiliza `staticUrl('data/archivo.geojson')`.

## 3. Crear o utilizar el repositorio

Instala Git para Windows y Node.js 24 o posterior. Abre esta carpeta en Visual Studio Code y una terminal PowerShell. Comprueba primero:

```powershell
node --version
npm.cmd ci
npm.cmd test
npm.cmd run build:pages
```

En GitHub crea un repositorio, por ejemplo `visor-gis`. Para utilizar Pages con una cuenta gratuita personal, normalmente se utiliza un repositorio público. Si vas a subir esta carpeta existente, crea el repositorio vacío, sin README generado. Los datos que publiques en `public/` serán accesibles desde la web; no incluyas datos que no quieras publicar.

Si la carpeta todavía no tiene Git:

```powershell
git init
git branch -M main
git add .
git commit -m "Publicar visor GIS 0.4"
git remote add origin https://github.com/TU_USUARIO/visor-gis.git
git push -u origin main
```

Sustituye `TU_USUARIO` y el nombre del repositorio. Si la carpeta ya tiene Git, ejecuta `git status` y `git remote -v`; utiliza el remoto existente si es el correcto. No repitas `git remote add origin` cuando ya exista. Si el repositorio remoto tiene cambios previos, clónalo en otra carpeta y copia los archivos del proyecto, conservando su historial. No fuerces la subida para resolver conflictos.

Si prefieres la interfaz de VS Code, utiliza **Control de código fuente → Publicar rama**, autentícate en GitHub y elige el repositorio y su visibilidad. `.gitignore` excluye `node_modules`, `dist`, SQLite y el archivo `.env`; `.env.static` debe incluirse porque contiene una selección de modalidad, no secretos.

## 4. Activar GitHub Pages

En el repositorio abre **Settings → Pages → Build and deployment → Source** y selecciona **GitHub Actions**. Esta configuración corresponde al workflow ya incluido, no a la publicación desde una carpeta de una rama. Los permisos y el entorno `github-pages` están declarados en el workflow. [Documentación oficial de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

El workflow se ejecuta al subir a `main` y también mediante **Actions → Publicar visor en GitHub Pages → Run workflow**. Si tu rama principal tiene otro nombre, modifica `on.push.branches` en `.github/workflows/pages.yml` y las reglas del entorno `github-pages` cuando corresponda.

La acción `configure-pages` obtiene la ruta base y el workflow la pasa como `VITE_BASE_PATH`. Para un sitio de proyecto será `/visor-gis/`; para un sitio de usuario o un dominio propio será `/`. Vite necesita esa diferencia para encontrar los recursos. [Guía oficial de despliegue de Vite](https://vite.dev/guide/static-deploy.html#github-pages).

## 5. Revisar el despliegue y encontrar la dirección

En **Actions** abre la ejecución más reciente. Primero debe finalizar `build`: instalación con `npm ci`, pruebas con `npm test` y compilación estática. Después debe finalizar `deploy`. Si hay un error, abre el paso rojo y lee el primer mensaje de error, no solo el resumen final.

La dirección publicada aparece en el entorno **github-pages**, en el resumen del despliegue y en **Settings → Pages**. Su forma habitual es `https://TU_USUARIO.github.io/visor-gis/`. La URL del repositorio `github.com/...` permite editar o descargar código; la URL `github.io/...` abre la aplicación. El workflow no publica Express ni necesita copiar `server/` al alojamiento estático.

Comprueba en la web publicada que se cargan las tres capas originales, encuadra Asturias y Chile, cambia una opacidad y recarga, importa un GeoJSON y recarga, realiza una selección de análisis y calcula una ruta. En las herramientas del navegador, los datos deben cargarse desde `/visor-gis/data/...`, sin peticiones a `/api/layers`. Una fuente externa bloqueada no implica necesariamente un error de Pages: revisa HTTPS, CORS, URL de servicio y consola.

## 6. Probar la ruta de Pages en Windows

Para reproducir un sitio bajo `/visor-gis/` antes de subirlo:

```powershell
$env:VITE_BASE_PATH = '/visor-gis/'
npm.cmd run build:pages
npm.cmd run preview -- --host 127.0.0.1
```

Abre la dirección y ruta indicadas por Vite, normalmente `http://127.0.0.1:4173/visor-gis/`. Detén la previsualización con **Ctrl+C**. Retira la variable antes de volver al desarrollo local normal:

```powershell
Remove-Item Env:VITE_BASE_PATH
npm.cmd run dev
```

Para compilar el modo local usa `npm.cmd run build` y después `npm.cmd start`. No uses `npm.cmd start` para probar que Pages funciona sin backend; utiliza `build:pages` y `preview`. La previsualización de Vite es una herramienta local, no un servidor de producción.

## 7. Publicar actualizaciones

Modifica el código o los datos, ejecuta pruebas y compila. Revisa `git diff`, añade los archivos cambiados y crea una confirmación:

```powershell
npm.cmd test
npm.cmd run build:pages
git add .
git commit -m "Actualizar capas y herramientas del visor"
git push
```

El workflow vuelve a publicar al recibir el cambio en `main`. Si usas otra rama de desarrollo, intégrala en `main` para publicar. Las preferencias existentes en un navegador pueden conservar estilos anteriores aunque cambies los valores iniciales; prueba también en otro perfil para comprobar los valores de una primera visita.

Al reemplazar datos originales, revisa `src/config/defaultLayers.ts` para Pages y `server/database.js` para instalaciones locales nuevas. SQLite ya creado conserva los cambios de usuario; una migración explícita es necesaria si debes modificar instalaciones existentes. Para actualizar el catálogo de búsqueda tras cambiar las extensiones de datos ejecuta `npm.cmd run data:catalog`, que regenera `server/places.json` y `public/data/places.json`.

## 8. Problemas frecuentes y límites

- **Author identity unknown:** configura el autor antes del commit con `git config --local user.name "TU_NOMBRE"` y `git config --local user.email "TU_CORREO"`. Puede ser tu dirección noreply de GitHub. Repite `git commit` y después `git push`; un push sin un nuevo commit no publica los cambios preparados.
- **remote origin already exists:** consulta `git remote -v`. Si apunta al repositorio correcto no lo vuelvas a añadir. Solo si necesitas cambiar el destino utiliza `git remote set-url origin URL_CORRECTA`.
- **EPERM al reinstalar esbuild:** detén con Ctrl+C los servidores `dev` y `preview` de este proyecto antes de ejecutar `npm.cmd ci`. Si la instalación falla, no continúes con tests o compilación: las dependencias pueden haber quedado incompletas. No hace falta borrar el código ni el lockfile.
- **PowerShell no reconoce el texto powershell:** copia únicamente las líneas de comandos, sin las marcas de apertura y cierre de los bloques de código de Markdown.

- **Pantalla vacía o recursos 404:** revisa la ruta base y que se publicó la carpeta `dist` de `build:pages`.
- **Peticiones fallidas a `/api`:** se publicó una compilación de modo local. Vuelve a compilar con `VITE_STORAGE_MODE=browser` mediante `build:pages`.
- **Error de Pages al ejecutar Actions:** activa **Source: GitHub Actions**, revisa permisos y que `main` pueda desplegar al entorno.
- **GeoJSON visible localmente pero ausente en Pages:** comprueba que el archivo está en `public/data`, está incluido en Git y figura en `defaultLayers.ts`.
- **Importación desde enlace bloqueada:** el servidor debe permitir CORS y HTTPS. Descarga el archivo por el medio autorizado e impórtalo desde el equipo si el enlace no permite lectura web.
- **Preferencias desaparecidas:** comprueba dominio, puerto, perfil, navegación privada y limpieza de datos del sitio. No hay sincronización remota.
- **Muchas entidades:** el visor carga y procesa los GeoJSON completos en memoria; el límite de importación es 30 MiB por archivo y el navegador puede necesitar reducir aún más en móvil. Para mayor volumen se necesitan teselas vectoriales, procesamiento en servidor y paginación espacial.

El éxito de una compilación local no verifica un despliegue remoto. Solo se considera publicado cuando GitHub Actions finaliza y se comprueba la URL resultante.
