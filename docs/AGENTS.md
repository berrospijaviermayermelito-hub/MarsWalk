# MarsWalk – NASA Space Apps 2026 (Mapa de Marte)

Static web app: layered Mars map + safest walking route (EVA) over Jezero crater.
Full spec (Spanish): @docs/INFORME.md — read it before any big change.

## My role: frontend (web/)
Leaflet map, layer toggles, route display, elevation profile (Chart.js),
stop briefings, conditions traffic light, deployment (GitHub Pages / Vercel).

## Hard constraints
- ALL UI text in English (submission requirement). Code comments in English too.
- Only OSI-licensed libraries: Leaflet, Chart.js, CesiumJS. No Mapbox, no Google Maps.
- Mars is not Earth: use the equirectangular Mars CRS in map.js (R = 3389.5 km), never Web Mercator.
  Never use L.circle (it uses the Earth radius internally): use marsCircle(). Mars Trek tiles: tms must be false.
- No backend. Static files only; data comes from data/*.json (cost_grid.json, meda_summary.json).
- Every screen needs loading and error states.
- Map tiles come from Mars Trek WMTS; keep a local fallback copy of tiles for the work area.
- Traffic light means "typical conditions for this season/hour", never "live" (MEDA data is released in batches).
- Do not invent thresholds (s_max, walk_back_km, vel_kmh): cite a source or label "assumed value for demo".
- Preload a sample route so the 30 s demo video does not depend on live clicks.
- Every external data/library used must be listed in DATA_SOURCES.md.

## Work area
Jezero crater, approx. 18.4° N, 77.5° E. Fictional habitat on the crater floor,
2–3 science stops at the delta front (exact spots still to be decided).

## Safety UI rules
- Cells with slope > s_max: blocked, painted red.
- Circle for walk_back_km; alert if the route crosses it.
- Traffic light (green/amber/red) from temperature, dust, radiation.
- Total EVA time compared against a configurable limit.

## Structure
```
web/index.html  web/style.css  web/config.js (params, layers, sources)  web/ui.js
web/map.js  web/profile.js  web/briefing.js  web/app.js  web/sample-data.js
web/route.js (A*, owned by another teammate)   web/tiles/ (local CTX fallback)
preprocessing/   (Python, data team)      data/   (light outputs)
```
Do not edit preprocessing/ or data/ without asking.
route.js exposes the path; the frontend only consumes it and draws it.

## Deadline
Features freeze Sunday Nov 15, 14:00 (Lima). First full submission 18:00. Final before 23:00.
