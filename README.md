# MarsWalk

**Plan a safe Mars walk over Jezero crater – where to go, when to go, and why.**

NASA Space Apps Challenge 2026 · Challenge: *Interplanetary Survival Guide: Mars Map*.

MarsWalk is a static web app that combines layers from several NASA missions into one map of
Jezero crater and plans the safest walking route (EVA) from a fictional habitat to science targets.

- **Where?** Route over high-resolution CTX / HiRISE imagery, with distance, EVA time, elevation profile and safety checks (walk-back radius, max slope, EVA time limit).
- **When?** Traffic light with *typical* temperature, dust and radiation for the chosen season and hour (Perseverance MEDA, Curiosity RAD). Not live weather: MEDA data is released in batches.
- **Why?** Science stops (delta layers, clays, carbonates detected by CRISM) with a short briefing, plus a guided **Start EVA** mode that walks through the route stop by stop.

## Run locally

No build step. Serve the repository root with any static server and open `web/`:

```bash
python3 -m http.server 8000
# open http://localhost:8000/web/
```

Opening `web/index.html` directly also works, but then the team data files in `data/`
cannot be fetched and the app falls back to sample data.

## Project structure

```
web/              frontend (Leaflet + Chart.js, plain JS)
  config.js       parameters, layers, data sources
  map.js          map, Mars CRS, layers, route drawing, safety checks
  briefing.js     route summary, traffic light, stop briefings, EVA mode
  profile.js      elevation profile
  app.js          boot sequence
  route.js        A* route planner (route team)
  sample-data.js  sample data used until data/ is ready
  tiles/          local fallback copy of CTX tiles
preprocessing/    Python data pipeline (data team)
data/             light outputs: cost_grid.json, meda_summary.json, stops.json
docs/             internal team docs (Spanish)
```

## Limitations

- Conditions are typical values for a season and hour, not a live forecast.
- Radiation comes from Curiosity/RAD at Gale crater, used as a proxy for Jezero.
- Values tagged **assumed** in the app (max slope, walk-back radius, speed, EVA limit, thresholds) are placeholders until a published source is cited.
- Slope accuracy depends on the DEM resolution used by `preprocessing/`.

## Data sources and license

All data sources, citations and library licenses: [DATA_SOURCES.md](DATA_SOURCES.md).
Code released under the [MIT License](LICENSE).
