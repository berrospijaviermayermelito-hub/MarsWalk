# Frontend: mínimo para cumplir el reto

Checklist del frontend (`web/`) derivado del enunciado oficial del reto. Complementa [INFORME.md](INFORME.md) y [AGENTS.md](AGENTS.md).

## El enunciado, frase por frase

> «…crear una **vista integrada y en capas** de una **ubicación o ruta** en la superficie marciana que reúna **datos de múltiples misiones** científicas de la NASA y pueda ayudar a un explorador humano a **planificar y llevar a cabo** una caminata marciana exitosa mientras realiza **ciencia** a lo largo del camino.»
>
> El astronauta quiere «**detalles de sus rutas y destinos**, actualizaciones sobre las **condiciones actuales** y los datos para completar su misión de forma **rápida y segura**».

Cada frase en negrita tiene que verse en la pantalla. Si una no aparece en el video de 30 s, el jurado no la va a contar.

## MUST: sin esto no cumplimos el reto

Estado: ✅ hecho · 🟡 parcial · ❌ falta (al 14 nov, tarde).

| # | Funcionalidad | Frase del reto | Estado |
| --- | --- | --- | --- |
| 1 | **Mapa base de Jezero** con CRS equirectangular y mosaicos de Mars Trek | ubicación | ✅ CTX 6 m + HiRISE 25 cm + Viking de contexto |
| 2 | **Capas activables** con misión/instrumento en el nombre | vista en capas · múltiples misiones | ✅ MOLA (MGS), THEMIS (Odyssey), celdas bloqueadas · minerales vía paradas CRISM |
| 3 | **Ruta dibujada** desde `route.js` + **ruta de ejemplo precargada** | ruta · planificar | ✅ usa `route.js` si existe; si no, ruta demo (ida y vuelta) |
| 4 | **Resumen de ruta**: distancia, tiempo de EVA, paradas | rápida | ✅ |
| 5 | **Perfil de elevación** (Chart.js) | detalles de sus rutas | 🟡 listo, espera `elevation_m` en `cost_grid.json` |
| 6 | **Paradas científicas** con **briefing** | destinos · ciencia | ✅ con textos de muestra (ciencia debe confirmar) |
| 7 | **Semáforo de condiciones** con selector de estación/hora | condiciones actuales | 🟡 listo, con datos de MUESTRA hasta `meda_summary.json` |
| 8 | **Reglas de seguridad visibles** | segura | ✅ círculo a escala de Marte, pendiente > s_max, límite de tiempo |
| 9 | **Panel «Data sources»** + `DATA_SOURCES.md` | múltiples misiones | ✅ |
| 10 | **Interfaz en inglés** con carga y error | requisito | ✅ |
| 11 | **Copia local de mosaicos** | demo confiable | ✅ `web/tiles/ctx` (7,7 MB) |
| 12 | **Desplegado** en GitHub Pages | requisito | ❌ lo activa el dueño del repo |

## SHOULD: sube la nota si hay tiempo

- ✅ **Modo «Start EVA»** (cubre «llevar a cabo», no solo planificar): botón que recorre la ruta parada por parada, centra el mapa en cada una, abre su briefing y muestra el tiempo acumulado. Además es la mejor toma para el video.
- Clic en origen y destino para recalcular la ruta en vivo.
- ✅ Panel de parámetros con etiqueta «assumed» o «cited» en cada valor.
- Puntaje científico por ruta («safest route through ≥ 1 carbonate outcrop»).

## COULD: solo si sobra tiempo

- Vista 3D con CesiumJS.
- Comparar dos rutas (la más corta frente a la más segura).

## Contrato con los otros equipos (implementado en el frontend, por confirmar)

El frontend solo consume estos datos. Si un archivo falta, la app usa `web/sample-data.js` y lo marca como «Sample data».

```js
// route.js (equipo de ruta). Se llama una vez por tramo: hábitat → A → B → C → hábitat
window.MarsWalkRoute = {
  findPath: function (startLatLng, endLatLng, costGrid) {
    return { path: [[lat, lng], ...], elevations_m: [...] /* opcional */ };
  },
};
// Para dibujar otra ruta desde fuera: MW.drawRoute(path, { label: "..." })
```

```jsonc
// data/cost_grid.json (equipo de datos). Arrays planos (fila norte primero) o [fila][col].
{ "bounds": [[latSur, lngOeste], [latNorte, lngEste]], "rows": 500, "cols": 500,
  "s_max_deg": 15, "slope_deg": [...], "roughness": [...], "elevation_m": [...] }

// data/meda_summary.json (equipo de datos)
{ "source": "MEDA, sols X–Y",
  "hours": ["06:00", "09:00", "12:00", "15:00", "18:00"],
  "seasons": { "Northern spring (Ls 0–90)": { "06:00": { "temp_c": -78, "dust_tau": 0.45 } } } }

// data/stops.json (equipo de ciencia)
{ "habitat": { "name": "...", "latlng": [lat, lng] },
  "stops": [{ "id": "A", "name": "...", "latlng": [lat, lng], "mineral": "...", "instrument": "MRO CRISM",
              "briefing": "...", "task": "...", "source_url": "..." }] }
```

Los parámetros (s_max, walk_back_km, vel_kmh, límite de EVA, umbrales del semáforo) están en `web/config.js`. Al conseguir una fuente, se cambia `source: null` por la cita y la etiqueta pasa a «cited».

## Pendiente

1. Equipo de ciencia: confirmar coordenadas del hábitat y las paradas (`data/stops.json`).
2. Equipo de datos: `cost_grid.json` (activa capa de bloqueo, chequeo de pendiente y perfil) y `meda_summary.json` (reemplaza la muestra).
3. Equipo de ruta: `web/route.js` con `MarsWalkRoute.findPath`.
4. Fuentes para los valores «assumed».
5. Activar GitHub Pages (Settings → Pages → rama, carpeta `/`) y probar `…/web/` en incógnito.
