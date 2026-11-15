# MarsWalk – NASA Space Apps 2026 (Mars Map)

Static web app: layered Mars map + safest walking route (EVA) over western Jezero crater.
Team rules and frozen decisions: @docs/TEAM_RULES.md — read it before any change.
Frontend checklist: @docs/FRONTEND.md. Data formats: README, "Data format".

## My role: frontend (web/, except route.js)
Leaflet map, layer toggles, route display, elevation profile (Chart.js), stop briefings,
typical conditions, radiation context, EVA mode.

## Hard constraints
- ALL text in English: UI, code comments, docs (submission requirement).
- Only OSI-licensed libraries (Leaflet, Chart.js). No Mapbox, no Google Maps.
- Mars CRS in map.js (equirectangular, R = 3396.19 km = body_radius_m), never Web Mercator.
  Never use L.circle (Earth radius): use marsCircle(). Mars Trek tiles: never tms: true.
- No backend. Data comes only from data/*.json. No sample or illustrative values on screen.
- Every value shown needs a source in DATA_SOURCES.md; without one it is a labeled user input.
- No green/amber/red colors without a sourced threshold.
- Every panel needs loading and error states.
- Every external data/library used must be listed in DATA_SOURCES.md.

## Structure
```
web/index.html  web/style.css  web/config.js (params, layers, sources)  web/ui.js
web/map.js  web/profile.js  web/briefing.js  web/app.js
web/route.js (A*, route team)
preprocessing/ and data/ (data team; data/tiles/ is the offline tile copy)
```
Do not edit preprocessing/, data/, route.js, DATA_SOURCES.md or TEAM_RULES.md without asking.

## Deadline
Feature freeze Sunday Nov 15, 14:00 (Lima). Submission closes 23:59 (Lima).
