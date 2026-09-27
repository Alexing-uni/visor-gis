# Revisión del recuento

El 25 de septiembre de 2026 se comparó la selección del visor con **Shapely 2.1.2 / GEOS 3.13.1**, un motor independiente. Los **45 casos coincidieron**, tanto en el total como en los registros seleccionados. No fue necesario cambiar el algoritmo.

Se comprobaron 14 zonas por cada capa original (42 casos) y tres zonas sobre 1.265 entidades de prueba. Se incluyeron rectángulos, triángulos, formas cóncavas, bordes, huecos y geometrías múltiples. El inventario original completo contiene 9.999 puntos, 6.233 líneas y 399 polígonos.

## Cómo leer el resultado

Se cuenta cada registro que intersecta o toca la figura. Una geometría múltiple cuenta una vez. Los duplicados del archivo o de distintas capas cuentan por separado. Solo participan capas vectoriales visibles con opacidad mayor que cero.

Una entidad que atraviesa dos selecciones puede contarse en ambas. El tamaño de un símbolo en pantalla no cambia la geometría utilizada para contar.

La comprobación respalda estos casos; no garantiza la validez de cualquier archivo que se importe. El detalle está en [count-audit.json](count-audit.json).

## Repetir la comparación

Con las dependencias npm instaladas y un Python disponible:

```powershell
python -m pip install shapely==2.1.2
node scripts/audit-counts.mjs
python scripts/audit-counts.py
```

Shapely se usa solo para esta revisión, no para ejecutar el visor. Los scripts comparan los registros y actualizan el archivo de resultados.
