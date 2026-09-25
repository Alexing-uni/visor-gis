# Auditoría del recuento de entidades

El 25 de septiembre de 2026 se comparó el conjunto exacto de registros seleccionados por el visor con **Shapely 2.1.2 / GEOS 3.13.1**, un motor independiente de Turf. **Los 45 casos coinciden sin registros omitidos ni añadidos.** No se encontró un error de recuento en estos casos ni fue necesario modificar su algoritmo.

## Datos reales

Se analizaron 14 selecciones por capa: extensión completa, rectángulo central, zona exterior vacía, triángulo, polígono cóncavo y nueve celdas de una cuadrícula. La comparación usa los índices de los registros originales normalizados a WGS84: dos totales iguales con entidades diferentes no pasarían la prueba.

| Capa | Extensión completa | Rectángulo central | Triángulo | Polígono cóncavo |
| --- | ---: | ---: | ---: | ---: |
| Puntos de Chile | 9.999 | 2.654 | 2.598 | 5.042 |
| Viales de Asturias | 6.233 | 3.558 | 2.732 | 3.773 |
| Polígonos de Chile | 399 | 288 | 185 | 281 |

Cada selección de esta tabla se construye respecto de la extensión de su propia capa; las cifras de las columnas parciales no corresponden a una única zona común. El inventario completo suma 16.631 registros. GEOS no encontró geometrías inválidas en los conjuntos normalizados originales.

## Casos de borde

Se generaron 1.265 entidades sintéticas: 49 puntos de una malla, las 1.176 líneas entre todas sus parejas, 36 polígonos y cuatro registros adicionales con geometrías múltiples o un hueco. Las selecciones cuadrada, triangular y cóncava produjeron respectivamente 702, 556 y 1.074 entidades, idénticas en ambos motores. Esto incluye contactos por vértice, segmentos que coinciden con el borde y partes interiores/exteriores de una misma geometría múltiple.

## Cómo interpretar el número mostrado

- Cuenta registros GeoJSON (`Feature`), no vértices ni símbolos visibles en pantalla. Un `MultiPoint`, `MultiLineString` o `MultiPolygon` cuenta una vez si alguna parte intersecta la selección.
- Incluye entidades que cruzan o tocan el borde, aunque no estén completamente dentro. Un punto se cuenta por su coordenada, no por el radio de su símbolo en píxeles.
- Solo participan capas vectoriales visibles con opacidad mayor que cero. PNOA, WMS/WMTS y relieve no aportan entidades al recuento.
- Registros duplicados del archivo, o la misma entidad importada en dos capas, cuentan como registros distintos. No hay deduplicación por identidad real entre capas.
- Sumar recuentos de selecciones vecinas puede contar de nuevo una línea o un polígono que cruza varias zonas. Eso no implica duplicación dentro de una selección.
- Los avisos de capas sin cargar o errores de geometría indican que el resultado puede ser parcial.

Esta comprobación cubre los casos descritos; no certifica todos los posibles archivos importados ni sustituye la comprobación de una selección concreta del usuario.

## Reproducir la comparación

Desde la raíz del proyecto, con Node 24 y un Python que tenga Shapely:

```powershell
npm.cmd ci
python -m pip install shapely==2.1.2
node scripts/audit-counts.mjs
python scripts/audit-counts.py
```

Detén antes los servidores locales si necesitas reinstalar npm. Shapely solo se utiliza para esta auditoría, no es una dependencia del visor. El primer script genera los datos temporales en `.tmp/count-audit.json`; el segundo compara las selecciones y escribe [count-audit.json](count-audit.json), incluyendo diferencias y versiones del motor. Devuelve un código distinto de cero si encuentra discrepancias.
