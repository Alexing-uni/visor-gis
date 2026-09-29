# Publicar en GitHub Pages

La versión 1.1 se envía a `main`, que activa el workflow de publicación. Revisa el resultado en Actions antes de considerar disponible la web.

GitHub Pages sirve los archivos de la web. No ejecuta Express ni SQLite: por eso el proyecto incluye un modo estático que guarda ajustes e importaciones en el navegador. No hay sincronización entre usuarios o dispositivos.

## 1. Preparar el repositorio

El repositorio actual es [Alexing-uni/visor-gis](https://github.com/Alexing-uni/visor-gis) y ya está configurado. Si lo reutilizas, crea un repositorio en tu cuenta de GitHub y sube el proyecto.

Para una carpeta que todavía no tenga Git:

```powershell
git init
git add .
git commit -m "Version inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Sustituye usuario y repositorio. Si Git pide tu identidad, configura `git config user.name "Tu nombre"` y `git config user.email "Tu correo"`. Si ya existe un repositorio, consulta `git remote -v`; no repitas `remote add`.

## 2. Activar Pages

En GitHub, abre **Settings → Pages → Build and deployment** y elige **GitHub Actions** como origen.

El archivo `.github/workflows/pages.yml` instala dependencias, ejecuta las pruebas, compila el modo estático y publica `dist/`. Usa Node 24. La ruta base se obtiene automáticamente de GitHub Pages; `vite.config.ts` la aplica a los recursos. No tienes que cambiar rutas a mano para cada repositorio.

## 3. Revisar la publicación

Abre **Actions → Publicar visor en GitHub Pages**. Puedes iniciarlo con **Run workflow** o subir un cambio a `main`. Espera a que finalicen correctamente la compilación y el despliegue. Si falla, abre el paso rojo para leer el error.

La dirección aparece en **Settings → Pages** y en el resultado del despliegue. La actual es https://alexing-uni.github.io/visor-gis/. Para otro repositorio suele ser `https://TU_USUARIO.github.io/TU_REPOSITORIO/`.

## 4. Publicar cambios

Desde PowerShell, en la carpeta del proyecto:

```powershell
npm.cmd test
npm.cmd run build:pages
git add .
git commit -m "Actualizar el visor"
git push
```

Revisa los archivos antes de hacer el commit. No subas contraseñas ni datos privados. `.gitignore` excluye dependencias, compilados y bases locales. Cada actualización en `main` vuelve a ejecutar el despliegue.

## Probar antes de subir

`npm.cmd run dev:static` permite probar la modalidad sin servidor. La configuración está en `.env.static`; usa `VITE_STORAGE_MODE=browser`. El modo local normal sigue disponible con `npm.cmd run dev`.

Si borras los datos del sitio en el navegador, se pierden sus ajustes e importaciones. Una base compartida o cuentas de usuario necesitarían un backend alojado por separado.

## Un único registro de despliegue

Después de publicar correctamente, el workflow elimina los registros anteriores del entorno `github-pages` y conserva el nuevo. No borra commits ni ejecuciones de Actions. Si una publicación falla, conserva la anterior. Durante el proceso pueden aparecer temporalmente dos registros.
