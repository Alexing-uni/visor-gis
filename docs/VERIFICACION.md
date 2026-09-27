# Pruebas y limitaciones

Estas comprobaciones corresponden a la versión 0.4 revisada en septiembre de 2026. La versión 1.0 conserva esas funciones y pruebas; actualiza la identificación de versión y la limpieza del historial de despliegues.

## Comprobado

- Instalación y compilación local y estática.
- 42 pruebas automáticas: cálculos, selección libre, almacenamiento y otros comportamientos del visor.
- 45 comparaciones independientes del recuento, todas coincidentes: [detalle](RECUENTO.md).
- Ruta real Oviedo–Gijón mediante OSRM y gestión de un caso sin acceso: `routing-check.json`.
- Respuestas de fuentes externas: `sources-check.json`.
- Interfaz en ventanas de 1280 × 720, 1024 × 768 y 390 × 844.
- Publicación y funcionamiento del modo estático en GitHub Pages.

Para repetir las comprobaciones principales:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run build:pages
npm.cmd run check:routing
```

## No comprobado o pendiente

- Uso táctil en un móvil o tableta físicos.
- Disponibilidad permanente de los proveedores externos.
- Archivos arbitrarios de gran tamaño y todos los datos importables.
- Revisión visual de páginas del Word: el entorno no dispone del renderizador necesario. Se verifica su estructura, títulos, índice y contenido.

La última auditoría de dependencias del 25 de septiembre registró 11 avisos transitivos (3 moderados y 8 altos). Siguen pendientes de revisión; el aviso crítico anterior de MapLibre se corrigió. El paquete principal ronda los 3,1 MB sin comprimir, por lo que hay margen para mejorar la carga inicial.
