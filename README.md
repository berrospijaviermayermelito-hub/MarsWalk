# MarsWalk

**Plan it safe. Bring science back.**

MarsWalk is a web-based EVA (Mars walk) planner for **Jezero crater** (≈18.4° N, 77.5° E), the
Perseverance landing site. It is our entry for the NASA Space Apps Challenge 2026, challenge
*"Interplanetary Survival Guide: Map of Mars"*.

One screen answers three questions for a human explorer:

- **Where do I walk?** An automatic safest route (A\*) that avoids steep and rough terrain.
- **When do I go?** A traffic-light panel of typical conditions (temperature, dust, radiation)
  for the chosen season and time of sol.
- **Why do I go?** Science stops (geology, minerals) with a short briefing and a real
  Perseverance photo.

> Status: work in progress. The data layer is done (terrain cost grid, heights, slope validation,
> typical weather and offline map tiles); the web app is under construction.

## How it works

Static site, no backend. Heavy NASA data is processed once in Python and saved as light JSON
files that the browser loads directly.

```
NASA data ──► preprocessing/ (Python) ──► data/*.json ──► web/ (CesiumJS app)
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
| `data/radiation_context.json` | Reference surface radiation dose rate (Curiosity RAD, Gale crater) for EVA dose context |
| `preprocessing/build_overlays.py` | Renders the cost grid as transparent PNG overlays for the map |
| `data/overlays/` | `slope.png`, `blocked.png` and `overlays.json` (bounds and legend) |
| `preprocessing/build_candidate_sites.py` | Collects candidate habitat and science stops from NASA Mars Trek and checks them against the cost grid |
| `data/candidate_sites.json` | 17 NASA Mars Trek points of interest with coordinates, official description and walkability |
| `data/cost_grid_preview.png` | Quick-look image of elevation, slope and cost |
| `web/` | CesiumJS app (in progress) |
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

Downloads about 1.5 GB from the NASA PDS Atmospheres Node (takes several minutes) and keeps only
small hourly summaries in `data/raw/meda_hourly/`:

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

- **Route:** `web/route.js` (branch `ruta-astar`) loads `cost_grid.json` and `heights.json` with
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
- `heights.json`: `heights_m`, meters relative to the Mars areoid (MOLA datum).

`meda_summary.json` has 12 `ls_bins` of 30° of solar longitude (Ls 0° = northern spring equinox;
Jezero is in the northern hemisphere). Each bin has `hourly.<variable>`, a list of 24 entries
indexed by local true solar hour, each `{median, p10, p90, n}` or `null` when there is not enough
data. Variables: `air_temp_c`, `ground_temp_c`, `pressure_pa`, `wind_speed_ms`.

`radiation_context.json` holds one reference value, `absorbed_dose_rate_ugy_per_day` (210 µGy per
day, 8.75 µGy per hour), the formula for an EVA dose and its caveats. Radiation is shown as context
for the planned EVA duration (for example, 3 h ≈ 26 µGy), not as a traffic-light condition that
changes by hour.

## Route model

Step cost between neighboring cells: `C = d · (1 + w_p · s / s_max + w_r · r)`, and the cell is
blocked if `s > s_block` (`d` = distance, `s` = slope in degrees, `r` = roughness 0–1).

| Parameter | Value | Source |
|---|---|---|
| `s_max` | 20° | NASA Artemis requirement: a suited astronaut must walk up/down/across a 20° slope ([NASA NTRS, Scoville](https://ntrs.nasa.gov/api/citations/20210026296/downloads/Scoville%20Final%20presentation%20-%20compressed.pptx.pdf)); Artemis traverses planned under 20° (Peña-Asensio et al., 2023, doi:10.1016/j.actaastro.2023.10.010) |
| `s_block` | 15° | Safety margin below `s_max`: the 20 m CTX DEM underestimates short steep scarps. Blocking at 15° on the CTX slope catches ~88 % of the cells that an independent HiRISE 1 m DTM shows as steeper than 20° (see *Slope validation*) |
| `walk_back_km` | 10 km | Maximum EVA walk-back distance from Apollo experience, evaluated in the JSC Walkback Test (Vos, Gernhardt & Lee, 2007, doi:10.4271/2007-01-3133) |
| `vel_kmh` | 3.3 km/h | Walk-back speed used for Apollo 15 planning ([Bellcomm, "Apollo 15 EVA Capability"](https://www.nasa.gov/wp-content/uploads/static/history/alsj/19790073512_1979073512.pdf)) |
| `w_p`, `w_r` | 1.0, 1.0 | Team empirical tuning (assumed values for the demo) |

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

## Limitations

- **Lunar-derived parameters.** The slope, distance and speed limits come from lunar experience
  and studies. Mars has higher gravity (~3/8 g versus 1/6 g on the Moon) and future suits will
  differ, so these are reference values, not Mars mission requirements.
- **Resolution.** Slope is computed on the 20 m/px CTX DEM and each ~60 m cell keeps the
  steepest 20 m pixel inside it (conservative). Hazards smaller than 20 m (boulders, small
  scarps, sand ripples) are not resolved. Even with the 15° blocking margin, about 12 % of the
  slopes steeper than 20° are missed (see *Slope validation*, measured on one 70 km² area).
- **Roughness** is a relief-based proxy (RMS height residual in a 100 m window), not a rock
  abundance measurement.
- **Projection.** The DEM is equirectangular with standard parallel 0°, so its pixels are 20 m
  wide only at the equator. The script corrects east–west distances by cos(latitude)
  (~5 % at Jezero) before computing slope.
- **No live weather exists for Mars.** Conditions are typical values measured by Perseverance
  MEDA for the season and time of sol, not a forecast. They come from one location on the crater
  floor and a sample of sols (every 12th sol).
- **Wind** data are sparse: the MEDA wind sensor was progressively damaged by wind-blown sand from
  early 2022. Treat wind values with caution.
- **Radiation is not measured at Jezero.** Perseverance has no ionizing-radiation detector, so the
  app uses the dose rate measured by Curiosity's RAD in Gale crater (2012–2013) as a reference.
  Jezero is higher, with less atmosphere overhead, so its dose is expected to be somewhat higher.
  Solar particle events are not included, and the value is an absorbed dose (µGy), not a
  biological dose equivalent (Sv).
- **Dust** is not in the weather summary yet.

## Data and credits

Only NASA and USGS-NASA open data are used. See [DATA_SOURCES.md](DATA_SOURCES.md) for the full
list with missions, instruments, URLs and licenses.

## License

[MIT](LICENSE)
