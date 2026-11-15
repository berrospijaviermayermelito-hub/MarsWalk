# Frontend: checklist against the challenge

How the web app (`web/`) covers the challenge statement. Team rules and frozen decisions:
[TEAM_RULES.md](TEAM_RULES.md). Data formats: README, "Data format".

## The challenge, phrase by phrase

> "…create an **integrated, layered view** of a **location or route** on the Martian surface that
> brings together **data from multiple NASA science missions** and can help a human explorer
> **plan and carry out** a successful Mars walk while doing exciting new **science** along the way."
>
> The explorer wants "**details of their routes and destinations**, updates on **current
> conditions**, and the data needed to complete their mission **quickly and safely**."

Every phrase in bold must be visible on screen and in the 30-second video.

## Must-have features

| # | Feature | Challenge phrase | Status |
| --- | --- | --- | --- |
| 1 | Jezero base map, equirectangular Mars CRS, Mars Trek tiles | location | Done: CTX 6 m, HiRISE 25 cm, Viking context |
| 2 | Toggleable layers named with mission / instrument | layered view, multiple missions | Done: MOLA (MGS), THEMIS (Mars Odyssey), blocked terrain (CTX DTM), stops, walk-back radius |
| 3 | Route from `route.js` (A*, habitat → A → B → C → habitat) | route, plan | Done |
| 4 | Route summary: distance, walking time, stops | quickly | Done (time at stops is a user input) |
| 5 | Elevation profile (Chart.js) | details of their routes | Done (`data/heights.json` via `route.js`) |
| 6 | Science stops with briefing card | destinations, science | Done (`data/stops.json`, NASA text) |
| 7 | Typical conditions by season and hour | current conditions | Done: air/ground temperature, pressure, wind (MEDA), no colors |
| 8 | Visible safety rules | safely | Done: walk-back radius at Mars scale, blocked terrain, EVA duration |
| 9 | Radiation context | safely | Done: RAD reference rate × EVA duration |
| 10 | Data sources panel + `DATA_SOURCES.md` | multiple NASA missions | Done |
| 11 | English UI with loading and error states | submission rule | Done |
| 12 | Offline tiles | reliable demo | Done: falls back to `data/tiles/` |
| 13 | Published on GitHub Pages | submission rule | Pending (repository owner) |

## Extras

- **Start EVA** mode ("carry out"): walks the route stop by stop, opens each briefing and shows the
  elapsed distance and time. Best shot for the video.
- Route parameters panel with the source of each value on hover.

## Integration contract (as implemented)

```js
// web/route.js (route team)
await MarsWalkRoute.init("../data", { speedKmh, walkBackKm });
MarsWalkRoute.findPathVia([[lat, lng], ...], habitatLatLng)
//   -> { blocked, path, distance_km, elevations_m, max_distance_from_habitat_km, ... }

// web/map.js (frontend)
MW.drawRoute(path, { label, elevations_m, distance_km, max_distance_from_habitat_km });
```

Files read by the app: `data/stops.json`, `data/meda_summary.json`, `data/cost_grid.json`,
`data/radiation_context.json` (and `data/heights.json` through `route.js`).

## Rules for the frontend

- Only sourced values on screen; anything without a source is a user input, clearly labeled.
- No traffic-light colors without a sourced threshold.
- Never `L.circle` (Earth radius): use `marsCircle()` in `map.js`. Never `tms: true`.
- Feature freeze Sunday 14:00 (Lima); after that, bug fixes only, by pull request.
