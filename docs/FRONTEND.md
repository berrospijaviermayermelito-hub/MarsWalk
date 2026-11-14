# Frontend: mínimo para cumplir el reto

Checklist del frontend (`web/`) derivado del enunciado oficial del reto. Complementa [INFORME.md](INFORME.md) y [AGENTS.md](AGENTS.md).

## El enunciado, frase por frase

> «…crear una **vista integrada y en capas** de una **ubicación o ruta** en la superficie marciana que reúna **datos de múltiples misiones** científicas de la NASA y pueda ayudar a un explorador humano a **planificar y llevar a cabo** una caminata marciana exitosa mientras realiza **ciencia** a lo largo del camino.»
>
> El astronauta quiere «**detalles de sus rutas y destinos**, actualizaciones sobre las **condiciones actuales** y los datos para completar su misión de forma **rápida y segura**».

Cada frase en negrita tiene que verse en la pantalla. Si una no aparece en el video de 30 s, el jurado no la va a contar.

## MUST: sin esto no cumplimos el reto

Estado: ✅ hecho · 🟡 parcial · ❌ falta (al 14 nov).

| # | Funcionalidad | Frase del reto | Estado |
| --- | --- | --- | --- |
| 1 | **Mapa base de Jezero** con CRS equirectangular y mosaicos de Mars Trek (idealmente CTX, no solo Viking) | ubicación | 🟡 solo Viking 232 m |
| 2 | **Capas activables** (pendiente/celdas bloqueadas, mineralogía, hielo) con **leyenda** y **misión/instrumento** visible en cada capa | vista en capas · múltiples misiones | 🟡 selector con capas vacías |
| 3 | **Ruta dibujada** desde `route.js` (A*) + **ruta de ejemplo precargada** para el video | ruta · planificar | 🟡 ruta fija de demo |
| 4 | **Resumen de ruta**: distancia, tiempo de EVA, número de paradas | rápida | ✅ (con valores supuestos) |
| 5 | **Perfil de elevación** (Chart.js) de la ruta | detalles de sus rutas | ❌ |
| 6 | **Paradas científicas** con **briefing** al hacer clic: qué es, por qué importa, qué instrumento lo detectó | destinos · ciencia | 🟡 marcadores con popup de una línea |
| 7 | **Semáforo de condiciones** alimentado por `meda_summary.json`, con selector de estación/hora y el texto «typical conditions» | condiciones actuales | 🟡 maqueta fija en verde |
| 8 | **Reglas de seguridad visibles**: celdas con pendiente > s_max en rojo, círculo de walk_back_km **a escala de Marte**, alerta si la ruta sale del círculo, tiempo de EVA vs límite | segura | 🟡 círculo dibujado con radio terrestre (≈ mitad del tamaño real) |
| 9 | **Fuentes de datos en la app**: panel o modal «Data sources» con misión, instrumento y enlace de cada capa | múltiples misiones de la NASA | ❌ |
| 10 | **Interfaz 100 % en inglés**, con estados de carga y error en cada panel | requisito de envío | 🟡 hay error de mosaicos, faltan los demás |
| 11 | **Copia local de mosaicos** de la zona como respaldo | demo confiable | ❌ |
| 12 | **Desplegado** en GitHub Pages y probado en ventana de incógnito | requisito de envío | ❌ |

## SHOULD: sube la nota si hay tiempo

- **Modo «Start EVA»** (cubre «llevar a cabo», no solo planificar): botón que recorre la ruta parada por parada, centra el mapa en cada una, abre su briefing y muestra el tiempo acumulado. Además es la mejor toma para el video.
- Clic en origen y destino para recalcular la ruta en vivo.
- Panel de parámetros (s_max, walk_back_km, vel_kmh) con la fuente citada al lado de cada valor.
- Puntaje científico por ruta («safest route through ≥ 1 carbonate outcrop»).

## COULD: solo si sobra tiempo

- Vista 3D con CesiumJS.
- Comparar dos rutas (la más corta frente a la más segura).

## Contrato con los otros equipos (propuesta, por confirmar)

El frontend solo consume estos datos, no los genera. Hay que acordar el formato **hoy** para trabajar en paralelo.

```js
// route.js (equipo de ruta) expone:
window.MarsWalkRoute.findPath(startLatLng, endLatLng)
//   -> { path: [[lat, lng], ...], distance_km, elevations_m: [...], blocked: false }

// map.js (frontend) ya expone:
window.MarsWalk.drawRoute(path)
```

```jsonc
// data/cost_grid.json (equipo de datos)
{ "bounds": [[latS, lngW], [latN, lngE]], "rows": 500, "cols": 500,
  "s_max_deg": 0, "slope_deg": [...], "roughness": [...], "elevation_m": [...] }

// data/meda_summary.json (equipo de datos)
{ "source": "MEDA, sols X–Y",
  "by_season_hour": { "<season>": { "<hour>": { "temp_c": 0, "dust_tau": 0 } } } }

// data/stops.json (equipo de ciencia)
[{ "id": "A", "name": "...", "latlng": [lat, lng], "briefing": "...", "instrument": "CRISM", "source_url": "..." }]
```

## Orden sugerido (hasta el congelamiento del domingo 15, 14:00)

1. Corregir la escala del círculo (CRS con radio de Marte) y verificar la orientación de los mosaicos (`tms`).
2. Panel de briefing de paradas leyendo `data/stops.json`.
3. Semáforo leyendo `meda_summary.json`.
4. Perfil de elevación con Chart.js.
5. Capa de celdas bloqueadas desde `cost_grid.json`.
6. Panel «Data sources» y modo «Start EVA».
7. Mosaicos locales de respaldo y despliegue en GitHub Pages.
