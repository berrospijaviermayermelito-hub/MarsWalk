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

> Status: work in progress. The terrain preprocessing is done; the web app is under construction.

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

## Data format

Both JSON files share a `meta` block: `rows`, `cols`, `bounds_deg` (west/south/east/north,
east-positive longitude, planetocentric latitude), `cell_size_m`, `cell_size_deg` and
`body_radius_m` (3,396,190 m, the Mars sphere used by the DEM). Arrays are flat, row-major;
row 0 is the **northern** edge and column 0 is the western edge, so
`value(row, col) = array[row * cols + col]`.

- `cost_grid.json`: `slope_deg`, `roughness` (0–1) and `cost`.
  `cost = -1` means the cell is blocked.
- `heights.json`: `heights_m`, meters relative to the Mars areoid (MOLA datum).

## Route model

Step cost between neighboring cells: `C = d · (1 + w_p · s / s_max + w_r · r)`, and the cell is
blocked if `s > s_max` (`d` = distance, `s` = slope in degrees, `r` = roughness 0–1).

| Parameter | Value | Source |
|---|---|---|
| `s_max` | 20° | NASA Artemis requirement: a suited astronaut must walk up/down/across a 20° slope ([NASA NTRS, Scoville](https://ntrs.nasa.gov/api/citations/20210026296/downloads/Scoville%20Final%20presentation%20-%20compressed.pptx.pdf)); Artemis traverses planned under 20° (Peña-Asensio et al., 2023, doi:10.1016/j.actaastro.2023.10.010) |
| `walk_back_km` | 10 km | Maximum EVA walk-back distance from Apollo experience, evaluated in the JSC Walkback Test (Vos, Gernhardt & Lee, 2007, doi:10.4271/2007-01-3133) |
| `vel_kmh` | 3.3 km/h | Walk-back speed used for Apollo 15 planning ([Bellcomm, "Apollo 15 EVA Capability"](https://www.nasa.gov/wp-content/uploads/static/history/alsj/19790073512_1979073512.pdf)) |
| `w_p`, `w_r` | 1.0, 1.0 | Team empirical tuning (assumed values for the demo) |

## Limitations

- **Lunar-derived parameters.** The slope, distance and speed limits come from lunar experience
  and studies. Mars has higher gravity (~3/8 g versus 1/6 g on the Moon) and future suits will
  differ, so these are reference values, not Mars mission requirements.
- **Resolution.** Slope is computed on the 20 m/px CTX DEM and each ~60 m cell keeps the
  steepest 20 m pixel inside it (conservative). Hazards smaller than 20 m (boulders, small
  scarps, sand ripples) are not resolved.
- **Roughness** is a relief-based proxy (RMS height residual in a 100 m window), not a rock
  abundance measurement.
- **Projection.** The DEM is equirectangular with standard parallel 0°, so its pixels are 20 m
  wide only at the equator. The script corrects east–west distances by cos(latitude)
  (~5 % at Jezero) before computing slope.
- **No live weather exists for Mars.** Conditions will be shown as typical values for the season
  and time of sol, not as a forecast.

## Data and credits

Only NASA and USGS-NASA open data are used. See [DATA_SOURCES.md](DATA_SOURCES.md) for the full
list with missions, instruments, URLs and licenses.

## License

[MIT](LICENSE)
