# Data sources

Every dataset, service and reference used by MarsWalk. Only NASA and USGS-NASA open data are
used. Update this file every time a dataset is added.

## Datasets in use

### Mars 2020 Terrain Relative Navigation CTX DTM Mosaic (Jezero crater elevation)

| | |
|---|---|
| Mission / instrument | Mars Reconnaissance Orbiter (MRO), Context Camera (CTX) |
| Product | Digital terrain model mosaic, 20 m/px, aligned to MOLA topography (shown in NASA Mars Trek as "MRO CTX, Jezero DEM, Controlled") |
| Publisher | USGS Astrogeology Science Center, for the NASA Mars 2020 project |
| File | `JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif` |
| URL | https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif |
| DOI | [10.5066/P906QQT8](https://doi.org/10.5066/P906QQT8) |
| License | CC0 1.0 (public domain) |
| Accessed | 2026-11-14 |
| Used for | Slope, roughness, cost grid and heights: `data/cost_grid.json`, `data/heights.json`, `data/cost_grid_preview.png` (built by `preprocessing/build_cost_grid.py`) |

## Planned datasets (not used yet)

Listed so the citation is ready when each one is integrated. Move an entry to "Datasets in use"
and complete its URL, license and access date when it is added.

| Dataset | Mission / instrument | Source | Planned use |
|---|---|---|---|
| MRO CTX, Jezero Mosaic, Controlled | MRO / CTX | NASA Mars Trek WMTS, https://trek.nasa.gov/mars/ | Base imagery |
| MRO HiRISE, Jezero Mosaic, Controlled | MRO / HiRISE | NASA Mars Trek WMTS | High-resolution detail near the route |
| Perseverance (Mars 2020) Path | Mars 2020 | NASA Mars Trek | Real rover traverse overlay |
| "Jezero Crater Features and Landforms" bookmark | — | NASA Mars Trek | Candidate science stops |
| Geologic map of Jezero crater and Nili Planum (Sun & Stack, 2020, USGS SIM 3464) | — | USGS-NASA Planetary Geologic Mapping Program, doi:[10.3133/sim3464](https://doi.org/10.3133/sim3464) | Choosing stops by geologic unit |
| Perseverance raw images (credit NASA/JPL-Caltech) | Mars 2020 cameras | https://mars.nasa.gov/mars2020/multimedia/raw-images/ | Real photo at each stop |
| MEDA environmental data | Mars 2020 / MEDA | NASA PDS Atmospheres Node | Typical weather by season and time of sol |
| RAD radiation data | Mars Science Laboratory (Curiosity) / RAD | NASA PDS | Radiation context |

## References for route parameters

| Parameter | Reference |
|---|---|
| Maximum slope 20° | Scoville, NASA NTRS 20210026296: https://ntrs.nasa.gov/api/citations/20210026296/downloads/Scoville%20Final%20presentation%20-%20compressed.pptx.pdf |
| Maximum slope 20° | Peña-Asensio et al. (2023), *Acta Astronautica*, doi:[10.1016/j.actaastro.2023.10.010](https://doi.org/10.1016/j.actaastro.2023.10.010) |
| Walk-back distance 10 km | Vos, Gernhardt & Lee (2007), SAE Technical Paper 2007-01-3133, doi:[10.4271/2007-01-3133](https://doi.org/10.4271/2007-01-3133) |
| Walking speed 3.3 km/h | Bellcomm, "Apollo 15 EVA Capability": https://www.nasa.gov/wp-content/uploads/static/history/alsj/19790073512_1979073512.pdf |

## Software

| Library | License | Used in |
|---|---|---|
| NumPy | BSD-3-Clause | Preprocessing |
| Rasterio | BSD-3-Clause | Preprocessing |
| Matplotlib | Matplotlib License (BSD-compatible, PSF-based) | Preprocessing preview |
