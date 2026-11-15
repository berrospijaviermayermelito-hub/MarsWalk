# MarsWalk

**Plan it safe. Bring science back.**

MarsWalk is a web-based EVA (Mars walk) planner for the western part of **Jezero crater** (IAU
name center 18.41° N, 77.69° E), where NASA's Perseverance rover landed on February 18, 2021. It is our entry for the NASA Space Apps Challenge 2026, challenge
*"Interplanetary Survival Guide: Map of Mars"*.

One screen answers three questions for a human explorer:

- **Where do I walk?** An automatic safest route (A\*) that avoids steep and rough terrain.
- **When do I go?** Typical conditions measured by Perseverance (temperature, pressure, wind)
  for the chosen season and time of sol, plus radiation context.
- **Why do I go?** Science stops (geology, minerals) with a short briefing and a real
  Perseverance photo.

> Status: the data layer and the web app are integrated: real A* route, blocked terrain, elevation
> profile, typical MEDA conditions, radiation context, stop briefings and a guided EVA mode.

## Run locally

No build step. Serve the repository root with any static server and open `web/`:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/web/ in a browser. Opening `web/index.html` directly does not
work: the browser blocks loading the files in `data/`.

## Web app structure

```
web/              frontend (Leaflet + Chart.js, plain JavaScript)
  index.html      page layout
  style.css       dark theme
  config.js       route parameters (with sources), map layers, data sources shown in the app
  ui.js           shared helpers: status, errors, JSON loading
  map.js          map, Mars CRS, layers, blocked terrain, route drawing and safety checks
  briefing.js     route summary, typical conditions, radiation context, stop briefings, EVA mode
  profile.js      elevation profile
  app.js          boot sequence: loads data/, plans the EVA with route.js, draws it
  route.js        A* route planner (route team)
```

The app reads only the team files in `data/` (no sample values). If a file is missing it shows
an error. If Mars Trek is unreachable, CTX tiles are loaded from `data/tiles/`.

## How it works

Static site, no backend. Heavy NASA data is processed once in Python and saved as light JSON
files that the browser loads directly.

```
NASA data ──► preprocessing/ (Python) ──► data/*.json ──► web/ (Leaflet app)
```

| Path | Content |
|---|---|
| `preprocessing/build_cost_grid.py` | DEM → slope → roughness → cost grid + heights |
| `data/cost_grid.json` | Slope, roughness and traversal cost per cell (504 × 532 cells, ~60 m) |
| `data/heights.json` | Elevation per cell, for 3D relief and elevation profiles |
| `preprocessing/build_meda_summary.py` | MEDA weather CSVs → typical conditions by season and hour |
| `data/meda_summary.json` | Typical air/ground temperature, pressure and wind per season and local hour |
| `preprocessing/validate_slope.py` | Compares CTX slopes with an independent HiRISE DTM |
| `data/slope_validation.json` | Result of that comparison |
| `preprocessing/download_trek_tiles.py` | Downloads a local backup of NASA Mars Trek map tiles |
| `data/tiles/` | Backup of the CTX Jezero mosaic tiles (zoom 0–13), same folder layout as Mars Trek; `index.json` lists the URL templates and tile ranges |
| `data/stops.json` | Habitat and science stops chosen by the team, with NASA briefings and source URLs |
| `preprocessing/fetch_stop_photos.py` | Downloads the NASA Perseverance photo of each stop |
| `data/photos/` | One official NASA Mastcam-Z photo per stop (PIA24816, PIA24921, PIA25889) |
| `data/radiation_context.json` | Reference surface radiation dose rate (Curiosity RAD, Gale crater) for EVA dose context |
| `preprocessing/build_overlays.py` | Renders the cost grid as transparent PNG overlays for the map |
| `data/overlays/` | `slope.png`, `blocked.png` and `overlays.json` (bounds and legend) |
| `preprocessing/build_candidate_sites.py` | Collects candidate habitat and science stops from NASA Mars Trek and checks them against the cost grid |
| `data/candidate_sites.json` | 17 NASA Mars Trek points of interest with coordinates, official description and walkability |
| `preprocessing/build_traverse.py` | Perseverance's real traverse: map layer and check against the cost grid |
| `data/perseverance_traverse.geojson` | Perseverance's drives (NASA), one line per drive with its sol |
| `data/traverse_validation.json`, `data/traverse_preview.png` | How the cost grid classifies the terrain the rover crossed |
| `data/cost_grid_preview.png` | Quick-look image of elevation, slope and cost |
| `web/` | Leaflet web app (frontend and route teams) |
| `docs/TEAM_RULES.md` | Team rules, frozen decisions, parameters and open items |
| `DATA_SOURCES.md` | Every dataset and reference used, with URL and license/DOI |

## Rebuild the terrain data

```bash
pip install -r preprocessing/requirements.txt
```

Download the elevation GeoTIFF (9.7 MB, not committed) into `data/raw/`:

```bash
curl -L --create-dirs -o data/raw/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif
```

Build the grids (add `--bbox LON_W LAT_S LON_E LAT_N` to crop to a smaller work area):

```bash
python preprocessing/build_cost_grid.py --preview
```

Check the slope math on a synthetic tilted plane:

```bash
python preprocessing/build_cost_grid.py --self-test
```

## Rebuild the weather summary

Downloads one CSV per sensor for each sampled sol from the NASA PDS Atmospheres Node (a few MB
each; it takes several minutes) and keeps only small hourly summaries in `data/raw/meda_hourly/`:

```bash
python preprocessing/build_meda_summary.py
```

## Rebuild the slope validation

Needs the HiRISE DTM tile (125 MB, not committed) in `data/raw/`:

```bash
curl -L --create-dirs -o data/raw/DTM_MOLAtopography_DeltaGeoid_Jezero_C_Edited_affine_1m_Eqc_latTs0_lon0.tif https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/DTM_MOLAtopography_DeltaGeoid_Jezero_C_Edited_affine_1m_Eqc_latTs0_lon0.tif
```

```bash
python preprocessing/validate_slope.py
```

## Map tiles and offline backup

The base imagery is the NASA Mars Trek layer "MRO CTX, Jezero Mosaic, Controlled". Mars Trek
allows browser requests from any site (CORS `Access-Control-Allow-Origin: *`). A copy of the
Jezero tiles is kept in `data/tiles/` with the same folder layout, so the app only has to change
the base URL if Mars Trek is slow or down:

```
live:   https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/default/default028mm/{z}/{row}/{col}.png
backup: data/tiles/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/default/default028mm/{z}/{row}/{col}.png
```

Tiling scheme: geographic (equirectangular), 256 px tiles, level 0 is 2 × 1 tiles covering the
whole planet (in Leaflet: `L.CRS.EPSG4326`; in CesiumJS: `GeographicTilingScheme` with 2 × 1 root tiles on a Mars ellipsoid).
The backup only covers the Jezero work area; outside it the app needs the live service.

Rebuild the backup:

```bash
python preprocessing/download_trek_tiles.py
```

## Frontend integration (Leaflet)

How to use the data layer from the Leaflet map in `web/`. All paths are relative to `web/`, so
the site must be published from the repository root (see *How it works*).

### 1. Base tiles: do not use `tms: true`

Mars Trek WMTS tiles count rows from the **north** (`TopLeftCorner -180 90` in the
capabilities), which is Leaflet's default. With `tms: true` Leaflet requests the mirrored row in
the southern hemisphere: for Jezero at zoom 11, row 1235 instead of 812, which returns 404 for
the Jezero layer and wrong terrain for global layers.

```js
const map = L.map("map", { crs: L.CRS.EPSG4326, center: [18.44, 77.45], zoom: 11, maxZoom: 15 });

// Global context (Viking color mosaic), low resolution.
L.tileLayer(
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
  { maxNativeZoom: 7, attribution: "NASA/JPL/USGS, Mars Trek" }
).addTo(map);

// Jezero CTX mosaic (6 m/px), with the local backup as fallback.
const CTX = "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/default/default028mm/{z}/{y}/{x}.png";
const ctxLayer = L.tileLayer("https://trek.nasa.gov/tiles/Mars/EQ/" + CTX, {
  bounds: [[18.2110274, 77.1604655], [18.7211945, 77.6991776]],
  maxNativeZoom: 13,
  attribution: "NASA/JPL/USGS, MRO CTX",
}).addTo(map);
ctxLayer.on("tileerror", (e) => {
  // Mars Trek unavailable: load the same tile from the repository copy (only once per tile).
  if (e.tile.dataset.fallback) return;
  e.tile.dataset.fallback = "1";
  const { x, y, z } = e.coords;
  e.tile.src = "../data/tiles/" + CTX.replace("{z}", z).replace("{y}", y).replace("{x}", x);
});
```

Leaflet's `L.CRS.EPSG4326` uses 2 × 1 tiles of 256 px at zoom 0, the same scheme as Mars Trek, so
`{z}/{y}/{x}` map directly to `TileMatrix/TileRow/TileCol`.

### 2. Distances and circles: Leaflet assumes Earth

`L.circle(center, radiusMeters)` converts meters to degrees with **Earth's** radius
(6,371 km, hard-coded in Leaflet 1.9). A 10 km walk-back circle drawn that way covers only
about 5.3 km on Mars. Draw it as a polygon with the Mars radius used by the data
(`body_radius_m` = 3,396,190 m), and use the same radius for any distance calculation:

```js
const MARS_R_M = 3396190;

function marsCircle(center, radiusM, options) {
  const [lat, lon] = center.map((v) => (v * Math.PI) / 180);
  const d = radiusM / MARS_R_M;
  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const b = (2 * Math.PI * i) / 128;
    const lat2 = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(b));
    const lon2 = lon + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(lat2));
    pts.push([(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI]);
  }
  return L.polygon(pts, options);
}

marsCircle([18.4386, 77.4508], 10000, { color: "#ffb74d", fill: false, dashArray: "6 4" }).addTo(map);
```

### 3. Slope and blocked-terrain overlays

`data/overlays/` has the cost grid rendered as transparent PNGs (one pixel per cell), ready for
`L.imageOverlay`. Bounds and legend are in `data/overlays/overlays.json`.

```js
const ov = await fetch("../data/overlays/overlays.json").then((r) => r.json());
const slopeLayer = L.imageOverlay("../data/overlays/slope.png", ov.leaflet_bounds, { opacity: 0.8 });
const blockedLayer = L.imageOverlay("../data/overlays/blocked.png", ov.leaflet_bounds);
blockedLayer.addTo(map);
// Keep cell edges sharp when zoomed in.
blockedLayer.getElement().style.imageRendering = "pixelated";
```

Red means blocked (`cost = -1`, slope above `s_block_deg` = 15° or no data). Rebuild after any
change to the cost grid with `python preprocessing/build_overlays.py`.

### 4. Route, conditions and radiation

- **Route:** `web/route.js` loads `cost_grid.json` and `heights.json` with
  `MarsRoute.loadPlanner("../data")` and returns the path, distance, time and elevation profile.
- **Conditions:** pick the `ls_bins` entry for the season and index `hourly.<variable>` by local
  hour in `data/meda_summary.json`. Show `null` as "no data" (wind is missing in most seasons).
- **Radiation:** show `absorbed_dose_rate_ugy_per_hour × EVA duration` from
  `data/radiation_context.json` as context, with the note that it was measured in Gale crater.

## Data format

Both JSON files share a `meta` block: `rows`, `cols`, `bounds_deg` (west/south/east/north,
east-positive longitude, planetocentric latitude), `cell_size_m`, `cell_size_deg` and
`body_radius_m` (3,396,190 m, the Mars sphere used by the DEM). Arrays are flat, row-major;
row 0 is the **northern** edge and column 0 is the western edge, so
`value(row, col) = array[row * cols + col]`.

- `cost_grid.json`: `slope_deg`, `roughness` (0–1) and `cost`.
  `cost = -1` means the cell is blocked. Its `meta` also has `s_max_deg` (20) and `s_block_deg`
  (15). To draw blocked cells, use `cost = -1` or `s_block_deg`, not a fixed 20°.
- `heights.json`: `heights_m`, in meters. Per the USGS product metadata, elevation values refer
  to the Mars 2020 IAU sphere with a radius of 3,396,190 m.

`meda_summary.json` has 12 `ls_bins` of 30° of solar longitude (Ls 0° = northern spring equinox;
Jezero is in the northern hemisphere). Each bin has `hourly.<variable>`, a list of 24 entries
indexed by local true solar hour, each `{median, p10, p90, n}` or `null` when there is not enough
data. Variables: `air_temp_c`, `ground_temp_c`, `pressure_pa`, `wind_speed_ms`.

`radiation_context.json` holds one reference value, `absorbed_dose_rate_ugy_per_day` (210 µGy per
day, 8.75 µGy per hour assuming a 24-hour day), the formula for an EVA dose and its caveats. Radiation is shown as context
for the planned EVA duration (for example, 3 h ≈ 26 µGy), not as a traffic-light condition that
changes by hour.

## Route model

Step cost between neighboring cells: `C = d · (1 + w_p · s / s_max + w_r · r)`, and the cell is
blocked if `s > s_block` (`d` = distance, `s` = slope in degrees, `r` = roughness 0–1).

| Parameter | Value | Source |
|---|---|---|
| `s_max` | 20° | NASA requirement HLS-S-R-0071, quoted in Scoville (NASA NTRS 20210026296): "Astronaut in suit must be able to walk up, down, across a 20-degree slope." |
| `s_block` | 15° | Peña-Asensio et al. (2023) adopt "<15°, which is conservative because 20° is considered a permissible limit". Our HiRISE check also shows that the 20 m CTX DEM underestimates short steep scarps: blocking at 15° on the CTX slope catches 88 % of the cells steeper than 20° (see *Slope validation*) |
| `walk_back_km` | 10 km | NASA JSC Walkback Test report (Vos, Gernhardt & Lee, 2007, NTRS 20070016007): "based on Apollo program experience, ... 10 kilometers (6.2 mi) will be the maximum EVA excursion distance from the lander or habitat" |
| `vel_kmh` | 3.4 km/h | Cavagna, Willems & Heglund (1998), "Walking on Mars", *Nature* 393, 636, doi:10.1038/31374: "The optimal walking speed on Mars will be 3.4 km h-1 (down from 5.5 km h-1 on Earth)". Measured without a spacesuit in reduced-gravity flights |
| `eva_limit_h` | 6 h | Scoville (NASA NTRS 20210026296), slide 4: "Nominal EVA excursion is 6 hours +/- 2 hours" (Artemis, Moon) |
| `w_p`, `w_r` | 1.0, 1.0 | Team empirical tuning (assumed values for the demo) |

## Route planner (`web/route.js`)

`web/route.js` computes the safest walking route on the cost grid. It runs in the browser and
needs no server. It reads `data/cost_grid.json` and `data/heights.json`.

**How it works**

- **Algorithm:** A* with 8 directions. Blocked cells (`cost = -1`) are never entered, and a
  diagonal step cannot cut the corner of a blocked cell.
- **Step cost:** real distance in km (cells are not square: east-west and north-south sizes come
  from `cell_size_m`) multiplied by the average cost of the two cells.
- **Heuristic:** straight-line distance in km. It never overestimates, because the lowest cell
  cost is 1.
- **Blocked clicks:** if a point falls on a blocked cell, it is moved to the nearest free cell
  (up to 10 cells away) and reported as snapped.
- **Time:** distance divided by `vel_kmh` (3.4 km/h by default). Time spent at the stops is not
  included.
- **Walk-back alert:** raised when any point of the route is farther than `walk_back_km`
  (10 km) from the habitat.

**Using it**

```js
await MarsWalkRoute.init("../data", { speedKmh: 3.4, walkBackKm: 10 });
const r = MarsWalkRoute.findPathVia([habitat, stopA, stopB, stopC, habitat], habitat); // [lat, lng] points
```

- `findPath(start, end, habitat)` plans one leg and `findPathVia(points, habitat)` joins several.
- On success, `r.blocked` is `false` and the result has `path` (`[lat, lng]` points),
  `distance_km`, `time_h`, `elevations_m`, `max_slope_deg`, `max_distance_from_habitat_km`
  and `exceeds_walk_back`.
- On failure, `r.blocked` is `true` and `r.reason` is one of `start_outside_area`,
  `end_outside_area`, `habitat_outside_area`, `start_blocked`, `end_blocked`, `no_route` or
  `need_at_least_two_points`. For several legs, `r.failed_leg` says which one failed.
- Self-test: run `node route.js` from the `web/` folder.

**Limitations**

- The walk-back limit uses the straight-line distance from the habitat, matching the 10 km circle
  on the map. The real walking distance can be longer when the route goes around obstacles.
- `time_h` is walking time only. `round_trip_*` fields double the distance and are meant for an
  out-and-back route, not for a loop that already returns to the habitat.
- The route is only as good as the grid: it inherits the 20 m CTX resolution, and about 12 % of
  the cells that HiRISE shows as steeper than 20° still pass the 15° block (see *Slope
  validation*). It does not model sand, boulders or the spacesuit. It is a planning aid, not a
  guarantee.


## Slope validation

`preprocessing/validate_slope.py` compares the CTX slopes with an independent HiRISE elevation
model (1 m/px, different stereo images) averaged to the same 20 m grid, over 69.6 km² around the
landing site and the delta front. Results are in `data/slope_validation.json`.

| Check | Result |
|---|---|
| Mean slope difference (CTX − HiRISE) | 0.05° (no bias) |
| Median absolute difference | 1.1° |
| RMSE | 2.5° |
| Cells within 5° | 94.9 % |
| Mean elevation difference | −0.15 m |
| Same walkable/blocked class at 20° | 99.2 % of cells |
| HiRISE cells steeper than 20° caught when blocking at 20° on CTX | 61 % |
| HiRISE cells steeper than 20° caught when blocking at **15°** on CTX (used) | **88 %** |

The CTX slopes are unbiased on average, but CTX smooths short, steep scarps: blocking at 20° on
the CTX slope would miss about 39 % of the cells that HiRISE shows as steeper than 20° (their
HiRISE slope is typically 23°, up to about 32°). The cost grid therefore blocks at **15°** on the
CTX slope (`s_block`) while keeping the 20° NASA limit as the reference. This catches 88 % of
those cells; about 12 % still pass, so the route is a planning aid, not a guarantee.

Over the validated area this blocks 2.8 % of the terrain instead of 1.3 %. Over the whole grid it
blocks 8.2 % instead of 3.0 %, mostly on the crater rim and the delta front; 99.8 % of the
walkable terrain stays connected as a single area.

## Check against Perseverance's real traverse

`preprocessing/build_traverse.py` samples Perseverance's 332 drives (NASA traverse data, sols
14–1176, 27.2 km) every 10 m and looks up each point in the cost grid. Results are in
`data/traverse_validation.json`; `data/traverse_preview.png` shows the traverse over the blocked
terrain.

| Check | Result |
|---|---|
| Traverse length on walkable cells | 98.3 % |
| Traverse length on blocked cells | 1.7 % (8 of 434 cells crossed) |
| Grid slope along the traverse | median 4.1°, 90th percentile 10.0° |

The few blocked cells are where the rover climbed the delta front (sols 536–538 and 700–709, next
to stop B) and a slope in the west (sols 1145–1159). A rover is not a walking astronaut, so this
does not prove the terrain is safe to walk; it shows that the grid does not block the terrain NASA
chose to drive through, except on its steepest parts.

## Limitations

- **Lunar-derived parameters.** The slope, distance and EVA-duration limits come from lunar
  experience and studies; the walking speed was measured without a spacesuit. Surface gravity is 3.73 m/s² on Mars versus 1.62 m/s² on the Moon (NASA NSSDC
  fact sheets), and future suits will differ, so these are reference values, not Mars mission
  requirements.
- **Resolution.** Slope is computed on the 20 m/px CTX DEM and each ~60 m cell keeps the
  steepest 20 m pixel inside it (conservative). Hazards smaller than 20 m (boulders, small
  scarps, sand ripples) are not resolved. Even with the 15° blocking margin, about 12 % of the
  slopes steeper than 20° are missed (see *Slope validation*, measured on one 70 km² area).
- **Roughness** is a relief-based proxy (RMS height residual in a 100 m window), not a rock
  abundance measurement.
- **Projection.** The DEM is equirectangular with standard parallel 0°, so its pixels are 20 m
  wide only at the equator. The script corrects east–west distances by cos(latitude)
  (~5 % at Jezero) before computing slope.
- **Conditions are not live.** They are typical values from archived Perseverance MEDA data
  (NASA PDS) for the season and time of sol, not a forecast. They were measured wherever the rover
  was on each sol, along its traverse in western Jezero, and use a sample of sols (every 12th).
- **Wind** covers only part of the mission. MEDA release notes (PDS): "wind data beyond sol 315
  is not provided due to certain damage to some components of the wind sensor, as a result of
  harsh weather conditions."
- **Radiation is not measured at Jezero.** NASA's list of Perseverance science instruments has no
  radiation detector, so the app uses the dose rate measured by Curiosity's RAD in Gale crater
  (2012–2013) as a reference. The value at Jezero may differ and is not quantified. Solar
  particle events are not included, and the value is an absorbed dose (µGy), not a biological
  dose equivalent (Sv).
- **Sand.** NASA describes the Séítah area, next to the landing site, as "an exposure of rock and
  sand" that "was considered too sandy and rocky for a safe landing". Sand is not resolved by the
  20 m DEM, so the cost grid can mark sandy terrain as walkable.
- **Dust** is not shown: we have no sourced dust data.

## Use of AI

NASA Space Apps asks teams to state where and how AI tools were used. MarsWalk used Claude
(Anthropic), an AI assistant, as follows:

- **Code:** the preprocessing scripts in `preprocessing/` and the code examples in this README were
  written with Claude's help and reviewed and run by the team.
- **Data:** every file in `data/` is produced by those scripts from NASA and USGS sources, or
  quotes a NASA source (`radiation_context.json`). The AI did not generate any data values. Each
  data file states this in its metadata field `ai_assistance`.
- **Text:** this README and DATA_SOURCES.md were drafted with Claude's help. Every fact in them is
  checked against the source listed in DATA_SOURCES.md.
- **Images, video and audio:** none were generated with AI.
- **Web app (`web/`, except `route.js`):** the frontend code (`index.html`, `style.css`,
  `config.js`, `ui.js`, `map.js`, `profile.js`, `briefing.js`, `app.js`) and the frontend docs
  (`docs/FRONTEND.md`, `docs/AGENTS.md`) were written with Claude Code (Anthropic) and reviewed and
  tested in the browser by the frontend author. The AI did not supply any value shown on screen:
  the app only displays the files in `data/` and the route parameters listed in DATA_SOURCES.md,
  and the time at each stop is a user input. The stop photo in the briefing card (image, title,
  instrument, sols and credit, all read from `photo` in `data/stops.json`) was also added with
  Claude Code; the AI wrote no text about the photos.
- **Route planner (`web/route.js`):** written with Claude's help (Anthropic) and tested against the real cost grid; reviewed by the route author.

## Data and credits

Only NASA and USGS-NASA open data are used. See [DATA_SOURCES.md](DATA_SOURCES.md) for the full
list with missions, instruments, URLs and licenses.

## License

[MIT](LICENSE)
