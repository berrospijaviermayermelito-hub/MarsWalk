# MarsWalk team rules and frozen decisions

Single source of truth for the team. Everything here was agreed on 2026-11-15 and is **frozen**:
do not change a decision, a parameter or a data file without telling the whole team first.
Every fact used anywhere (app, README, briefings, pitch) must have a source in
[DATA_SOURCES.md](../DATA_SOURCES.md).

## 1. Space Apps rules (from the official Project Submission Guide, 2026-11-13)

| Rule | What it means for us |
|---|---|
| Submission closes **Sunday, November 15, 11:59 p.m.** local time (Lima). Only the last saved submission is judged. | Submit early, then resubmit if needed. |
| All content in the project form **and in any linked material** must be in **English**. | README, docs, UI text, code comments, slides. A video may be spoken in Spanish only with English subtitles. |
| Demo: **video of 30 seconds or less**, or **slides, 7 or fewer** (including title and intro slides). Projects over these limits are not eligible for Global Judging. | One clear story, no extra slides. |
| Links (final project, demo) must be public, with **no login, permission or registration**. | Test every link in a private browser window before submitting. |
| AI ("Super Intelligence") use must be stated where and how it was used. **Images and videos**: visible watermark. **Audio**: acknowledged in text and metadata. **Code and data**: acknowledged in descriptive text and metadata. | README section "Use of AI" plus the `ai_assistance` field in every data file. Each author states their own AI use. |
| Generated content may not use, contain or modify **NASA branding** (logos, flags, mission identifiers). | No NASA logo or insignia in the app, slides or video. |
| No images, video, audio or likeness of **persons under 18**. | — |
| List all data, resources and tools used (code, text, images), even if open. | DATA_SOURCES.md, kept complete. |
| At least one NASA data set or resource is required for a Global Award. | We use several. |

## 2. Team rules

1. **No invented content.** Every number, name and statement comes from a source listed in
   DATA_SOURCES.md, quoted where possible. If something has no source, it is removed or shown as a
   user-adjustable planning input, never as a fact.
2. **Data:** NASA and USGS-NASA data only (team decision; the rules would also allow Space Agency
   Partner data such as ESA).
3. **Licenses:** repository under MIT; every library must have an OSI-approved license.
4. **English everywhere** in the repository and the app (see section 1).
5. **No personal data** in the app and no commercial promotion.

## 3. Frozen decisions

| Topic | Decision |
|---|---|
| Area | Western Jezero crater, the full CTX DEM area (77.16–77.70° E, 18.21–18.72° N). **No crop.** |
| Map library | **Leaflet 1.9.4** (`L.CRS.EPSG4326`, Mars Trek tiles with top-left origin, never `tms: true`). |
| Hosting | **GitHub Pages**, published from the root of `main`; the app is at `/web/` and loads `../data/`. |
| Habitat | Perseverance landing site, 18.44463° N, 77.45089° E (start of the rover's first drive in NASA's traverse data). |
| Science stops | A **Séítah** (Mars Trek POI 4) → B **Delta front** (POI 5) → C **Belva crater** (POI 7). Defined in `data/stops.json`. |
| Conditions panel | Typical **air temperature, ground temperature, pressure and wind** from `data/meda_summary.json`, by season and hour. Wind shows "no data" where it is `null`. **No dust** (no sourced data). |
| Colors in the conditions panel | Green/amber/red only with a sourced threshold. Without one, show the values without a color. |
| Radiation | Context only, not a traffic light: `absorbed_dose_rate_ugy_per_hour × EVA duration` from `data/radiation_context.json` (Curiosity RAD, Gale crater, 210 µGy per day). |
| Mars radius | 3,396,190 m (`body_radius_m` in the data files; the DEM sphere and the NASA equatorial radius). |

### Parameters

| Parameter | Value | Source (details in DATA_SOURCES.md) |
|---|---|---|
| `s_max` (reference slope limit) | 20° | NASA requirement HLS-S-R-0071, quoted in Scoville (NTRS 20210026296) |
| `s_block` (blocking threshold on the CTX slope) | 15° | Peña-Asensio et al. (2023), plus our HiRISE validation |
| `walk_back_km` | 10 km | NASA JSC Walkback Test report (NTRS 20070016007) |
| `vel_kmh` | 3.4 km/h | Cavagna, Willems & Heglund (1998), *Nature* 393, 636 |
| `eva_limit_h` | 6 h | Scoville (NTRS 20210026296): "Nominal EVA excursion is 6 hours +/- 2 hours" |
| Time at each stop | — | No source. Only as a user-adjustable input, clearly labeled. |

Planned EVA (A* on the cost grid, from `data/stops.json`): habitat → A → B → C → habitat,
12.2 km, 3.6 h of walking at 3.4 km/h (stop time not included), maximum slope 12.5°, at most
5.1 km from the habitat.

## 4. Data contract (`data/`, owned by Data & GIS)

| File | Content | Used by |
|---|---|---|
| `cost_grid.json` | Slope, roughness, cost per cell (`cost = -1` blocked) | `web/route.js` |
| `heights.json` | Elevation per cell | `web/route.js`, elevation profile |
| `overlays/` | `slope.png`, `blocked.png`, `overlays.json` (bounds) | Map overlays (`L.imageOverlay`) |
| `stops.json` | Habitat and stops A–C: name, coordinates, NASA briefing, source URL, sols for photos | Map, briefings |
| `meda_summary.json` | Typical conditions: 12 `ls_bins` × 24 hours | Conditions panel |
| `radiation_context.json` | Reference dose rate and caveats | Radiation context |
| `perseverance_traverse.geojson` | Perseverance's real drives (NASA), GeoJSON lines with sol | Optional map layer (`L.geoJSON`) |
| `traverse_validation.json`, `traverse_preview.png` | Grid check against the rover traverse | README, pitch |
| `candidate_sites.json` | All 17 NASA Mars Trek points checked against the grid | Reference only |
| `tiles/` | Offline copy of the CTX Jezero tiles | Fallback if Mars Trek is down |

Formats are documented in the README ("Data format" and "Frontend integration"). The app must
read these files; sample or illustrative values must not be shown.

## 5. Branches and ownership

- `main` holds the integrated project. Create your branch from the latest `main`, work only in
  your own files, and open a pull request to `main`. The repository owner (Data & GIS) merges.
- Ownership: Data & GIS: `data/`, `preprocessing/`, `DATA_SOURCES.md`, `docs/TEAM_RULES.md`.
  Route: `web/route.js`. Frontend: the rest of `web/`. README: shared, edit only your section.
- **Feature freeze: Sunday 14:00.** After that, only bug fixes, by pull request.

## 6. Open items before submission

### Done (2026-11-15)

| Owner | Item | Where |
|---|---|---|
| Frontend | Frozen parameters with sources in `web/config.js`; time at stops is a user input (default 0) | PR #6 |
| Frontend | App reads `data/stops.json`, `data/meda_summary.json`, `data/cost_grid.json`, `data/radiation_context.json`; sample values removed | PR #6 |
| Frontend | Radiation from `data/radiation_context.json` (the unverified 0.64 mSv/day removed) | PR #6 |
| Frontend | Claims without a source removed (THEMIS hint, "CRISM / HiRISE" stop label) | PR #6 |
| Frontend | Mars radius 3,396.19 km | PR #6 |
| Frontend | Spanish `docs/INFORME.md` removed, `docs/FRONTEND.md` translated | PR #6 |
| Route | Default speed 3.4 km/h; README section and AI-use line for `web/route.js` | PR #7 |
| Frontend | AI use of `web/` stated in the README "Use of AI" and in an `ai-assistance` meta tag | PR #10 |
| Data & GIS | GitHub Pages published from `main`: https://berrospijaviermayermelito-hub.github.io/MarsWalk/web/ | Repository settings |

### Still open

| Owner | Item |
|---|---|
| Science | Confirm or add a `task` for each stop (sourced), and pick one Perseverance photo per stop with its image ID and exact credit. |
| Science | The CRISM references for clays and carbonates (Goudge et al. 2015, Horgan et al. 2020) are not verified yet; verify them or do not use them. |
| Pitch | 30-second video or ≤ 7 slides, in English or with English subtitles; AI images watermarked; no NASA logo. |
| All | Before submitting: open every link (repository, prototype, documentation, demo) in a private browser window. |
