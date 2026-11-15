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

### MRO CTX, Jezero Mosaic, Controlled (base imagery tiles)

| | |
|---|---|
| Mission / instrument | Mars Reconnaissance Orbiter (MRO), Context Camera (CTX) |
| Product | Context Camera Orthorectified Image Mosaic for Mars 2020 Terrain Relative Navigation, 6 m/px (`JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0`) |
| Authors / publisher | Fergason, R., Galuszka, D., Hare, T., Mayer, D., Redding, B. and Smith, E. (2020), USGS Astrogeology Science Center, for the NASA Mars 2020 project |
| Served by | NASA Mars Trek (NASA/JPL), WMTS layer "MRO CTX, Jezero Mosaic, Controlled": https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml |
| DOI | [10.5066/P9GV1ND3](https://doi.org/10.5066/P9GV1ND3) |
| License | Public domain (NASA / USGS data; license not re-checked on the DOI page, confirm before submission) |
| Accessed | 2026-11-14 |
| Used for | Base imagery in the web app. A local backup of 930 tiles (zoom 0–13, ~5 m/px at the highest level, 28.6 MB) is in `data/tiles/`, downloaded by `preprocessing/download_trek_tiles.py`, in case Mars Trek is unavailable |

### Mars 2020 Terrain Relative Navigation HiRISE DTM, tile Jezero_C (validation only)

| | |
|---|---|
| Mission / instrument | Mars Reconnaissance Orbiter (MRO), High Resolution Imaging Science Experiment (HiRISE); stereo pair ESP_045994_1985 / ESP_046060_1985 |
| Product | Digital terrain model, 1 m/px, aligned to MOLA topography |
| Publisher | USGS Astrogeology Science Center, for the NASA Mars 2020 project |
| File | `DTM_MOLAtopography_DeltaGeoid_Jezero_C_Edited_affine_1m_Eqc_latTs0_lon0.tif` |
| URL | https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/DTM_MOLAtopography_DeltaGeoid_Jezero_C_Edited_affine_1m_Eqc_latTs0_lon0.tif |
| DOI | [10.5066/P9REJ9JN](https://doi.org/10.5066/P9REJ9JN) |
| License | Public domain (USGS product; license not re-checked on the DOI page, confirm before submission) |
| Accessed | 2026-11-14 |
| Used for | Independent check of the CTX slopes: `data/slope_validation.json` (built by `preprocessing/validate_slope.py`). Not used in the app. |

### Mars 2020 MEDA environmental data (Jezero crater weather)

| | |
|---|---|
| Mission / instrument | Mars 2020 Perseverance, Mars Environmental Dynamics Analyzer (MEDA): air temperature sensors (ATS), thermal infrared sensor (TIRS), pressure sensor (PS), wind sensor (WS) |
| Product | Mars 2020 MEDA Bundle (PDS4), calibrated and derived collections, one CSV per sol and sensor |
| Authors | Rodriguez-Manfredi, J. A. and de la Torre Juarez, M. (2021) |
| Publisher | NASA Planetary Data System (PDS), Atmospheres Node |
| URL | https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/ |
| DOI | [10.17189/1522849](https://doi.org/10.17189/1522849) |
| License | Public domain (NASA PDS data, no usage restrictions; citation requested) |
| Accessed | 2026-11-14 |
| Used for | Typical conditions by season and local hour: `data/meda_summary.json` (built by `preprocessing/build_meda_summary.py` from every 12th sol between sols 10 and 1850) |

Note on the host: `atmos.nmsu.edu` is the official NASA PDS Atmospheres Node, which New Mexico
State University operates for NASA. The data are NASA mission data archived by the PDS
(https://pds.nasa.gov/); the PDS asks users to cite the data set, as done here.

Solar longitude (season) is computed with the algorithm of Allison & McEwen (2000), *Planetary
and Space Science* 48, 215-235, doi:[10.1016/S0032-0633(99)00092-6](https://doi.org/10.1016/S0032-0633(99)00092-6),
as used by NASA GISS Mars24 (https://www.giss.nasa.gov/tools/mars24/).

### NASA Mars Trek Jezero points of interest (candidate habitat and science stops)

| | |
|---|---|
| Source | NASA Mars Trek (NASA/JPL) feature services behind two Jezero bookmarks: "Jezero Crater Features and Landforms" (`mars2020_waypoints`) and "Perseverance Landing Site", the Mastcam-Z tour (`mastcam_z_waypoints`) |
| URLs | https://trek.nasa.gov/mars/trekarcgis/rest/services/mars2020_waypoints/MapServer/0 and https://trek.nasa.gov/mars/trekarcgis/rest/services/mastcam_z_waypoints/MapServer/0; description pages under https://trek.nasa.gov/assets/bookmarks/mars/ |
| License | NASA content, public domain unless noted |
| Accessed | 2026-11-15 |
| Used for | `data/candidate_sites.json` (built by `preprocessing/build_candidate_sites.py`): names, coordinates and the first sentences of each NASA description, checked against the cost grid |

### Curiosity RAD surface radiation dose (reference value)

| | |
|---|---|
| Mission / instrument | Mars Science Laboratory (Curiosity rover), Radiation Assessment Detector (RAD) |
| Product | Published dose rate: about 210 micrograys per day (absorbed dose, almost entirely galactic cosmic rays), first 10 months on the surface (August 2012 – June 2013), Gale crater |
| Source | NASA Photojournal PIA17600, "Radiation Measurements on Mars", credit NASA/JPL-Caltech/SwRI (2013-12-09): https://science.nasa.gov/photojournal/radiation-measurements-on-mars/ |
| License | NASA media, public domain unless noted; credit NASA/JPL-Caltech/SwRI |
| Accessed | 2026-11-14 |
| Used for | Radiation context for an EVA: `data/radiation_context.json`. Measured in Gale crater, not Jezero (Perseverance carries no ionizing-radiation detector) |

## Planned datasets (not used yet)

Listed so the citation is ready when each one is integrated. Move an entry to "Datasets in use"
and complete its URL, license and access date when it is added.

| Dataset | Mission / instrument | Source | Planned use |
|---|---|---|---|
| MRO HiRISE, Jezero Mosaic, Controlled | MRO / HiRISE | NASA Mars Trek WMTS | High-resolution detail near the route |
| Perseverance (Mars 2020) Path | Mars 2020 | NASA Mars Trek | Real rover traverse overlay |
| Geologic map of Jezero crater and Nili Planum (Sun & Stack, 2020, USGS SIM 3464) | — | USGS-NASA Planetary Geologic Mapping Program, doi:[10.3133/sim3464](https://doi.org/10.3133/sim3464) | Choosing stops by geologic unit |
| Perseverance raw images (credit NASA/JPL-Caltech) | Mars 2020 cameras | https://mars.nasa.gov/mars2020/multimedia/raw-images/ | Real photo at each stop |

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
| certifi | MPL-2.0 | Preprocessing (TLS root certificates for the PDS download) |
| Matplotlib | Matplotlib License (BSD-compatible, PSF-based) | Preprocessing preview |
