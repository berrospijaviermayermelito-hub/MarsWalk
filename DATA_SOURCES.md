# Data sources

Every dataset, service and reference used by MarsWalk. Only NASA and USGS-NASA open data are
used. Every statement in the app and the documentation must be backed by one of the sources
below. Update this file every time a dataset or a fact is added.

Licenses and usage terms are quoted from the publisher's own pages, checked on the access date.

## Datasets in use

### Mars 2020 Terrain Relative Navigation CTX DTM Mosaic (Jezero crater elevation)

| | |
|---|---|
| Mission / instrument | Mars Reconnaissance Orbiter (MRO), Context Camera (CTX) |
| Product | Digital terrain model mosaic, 20 m/px (shown in NASA Mars Trek as "MRO CTX, Jezero DEM, Controlled"). Per the USGS metadata, "Elevation values are in meters and refer to the Mars 2020 IAU Sphere with a radius of 3396190m." |
| Originator / publisher | USGS Astrogeology Science Center, publication date 2020-07-24, for the NASA Mars 2020 project |
| File | `JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif` |
| URL | https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif |
| Product page | https://astrogeology.usgs.gov/search/map/Mars/Mars2020/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0 |
| DOI | [10.5066/P906QQT8](https://doi.org/10.5066/P906QQT8) |
| Usage terms | USGS product page: "Access Constraints: None"; "Use Constraints: Please cite authors" |
| Accessed | 2026-11-14 (usage terms checked 2026-11-15) |
| Used for | Slope, roughness, cost grid and heights: `data/cost_grid.json`, `data/heights.json`, `data/cost_grid_preview.png`, `data/overlays/` (built by `preprocessing/build_cost_grid.py` and `preprocessing/build_overlays.py`) |

### MRO CTX, Jezero Mosaic, Controlled (base imagery tiles)

| | |
|---|---|
| Mission / instrument | Mars Reconnaissance Orbiter (MRO), Context Camera (CTX) |
| Product | Context Camera Orthorectified Image Mosaic for Mars 2020 Terrain Relative Navigation, 6 m/px (`JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0`) |
| Authors / publisher | Fergason, R., Galuszka, D., Hare, T., Mayer, D., Redding, B. and Smith, E. (2020-07-24), USGS Astrogeology Science Center, for the NASA Mars 2020 project (authors from the USGS metadata) |
| Served by | NASA Mars Trek (NASA/JPL), WMTS layer "MRO CTX, Jezero Mosaic, Controlled": https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml |
| Product page | https://astrogeology.usgs.gov/search/map/Mars/Mars2020/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0 |
| DOI | [10.5066/P9GV1ND3](https://doi.org/10.5066/P9GV1ND3) |
| Usage terms | USGS product page: "Access Constraints: None"; "Use Constraints: Please cite authors" |
| Accessed | 2026-11-14 (usage terms checked 2026-11-15) |
| Used for | Base imagery in the web app. A local backup of 930 tiles (zoom 0–13, 28.6 MB) is in `data/tiles/`, downloaded by `preprocessing/download_trek_tiles.py`, in case Mars Trek is unavailable |

### Other NASA Mars Trek map layers shown in the web app

All served by NASA Mars Trek (NASA/JPL) as WMTS, https://trek.nasa.gov/tiles/Mars/EQ/{layer}/1.0.0/WMTSCapabilities.xml.
Titles, missions and instruments are the ones in the Mars Trek catalog (checked 2026-11-15).
Usage terms: JPL image and data use policy, https://www.jpl.nasa.gov/imagepolicy, credit line
"Courtesy NASA/JPL-Caltech" unless otherwise noted.

| Mars Trek title | Layer id | Mission / instrument |
|---|---|---|
| MRO HiRISE, Jezero Mosaic, Controlled | `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd` | Mars Reconnaissance Orbiter / HiRISE |
| Viking VIS, Global Color Mosaic | `Mars_Viking_MDIM21_ClrMosaic_global_232m` | Viking / MDIM21 |
| MGS MOLA, Global Color Hillshade | `Mars_MGS_MOLA_ClrShade_merge_global_463m` | Mars Global Surveyor / MOLA |
| MO THEMIS-IR Night, Global Mosaic | `THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018` | Mars Odyssey / THEMIS |

### Mars 2020 Terrain Relative Navigation HiRISE DTM, tile Jezero_C (validation only)

| | |
|---|---|
| Mission / instrument | Mars Reconnaissance Orbiter (MRO), High Resolution Imaging Science Experiment (HiRISE); stereo pair ESP_045994_1985 / ESP_046060_1985 (from the tile metadata title) |
| Product | Digital terrain model, 1 m/px. Per the USGS metadata, "Elevation values are in meters and refer to the Mars 2020 IAU Sphere with a radius of 3396190m." |
| Originator / publisher | USGS Astrogeology Science Center, for the NASA Mars 2020 project |
| File | `DTM_MOLAtopography_DeltaGeoid_Jezero_C_Edited_affine_1m_Eqc_latTs0_lon0.tif` |
| URL | https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/DTM_MOLAtopography_DeltaGeoid_Jezero_C_Edited_affine_1m_Eqc_latTs0_lon0.tif |
| DOI | [10.5066/P9REJ9JN](https://doi.org/10.5066/P9REJ9JN) (linked from the tile metadata; resolves to the Mars 2020 TRN HiRISE DTM mosaic product page) |
| Usage terms | USGS product page: "Access Constraints: None"; "Use Constraints: Please cite authors" |
| Accessed | 2026-11-14 (usage terms checked 2026-11-15) |
| Used for | Independent check of the CTX slopes: `data/slope_validation.json` (built by `preprocessing/validate_slope.py`). Not used in the app. |

### Mars 2020 MEDA environmental data (Jezero crater weather)

| | |
|---|---|
| Mission / instrument | Mars 2020 Perseverance, Mars Environmental Dynamics Analyzer (MEDA): air temperature sensors (ATS), thermal infrared sensor (TIRS), pressure sensor (PS), wind sensor (WS) |
| Product | Mars 2020 MEDA Bundle (PDS4), calibrated and derived collections, one CSV per sol and sensor |
| Authors | Rodriguez-Manfredi, J. A. and de la Torre Juarez, M. (2021) (from the bundle label) |
| Publisher | NASA Planetary Data System (PDS), Atmospheres Node |
| DOI | [10.17189/1522849](https://doi.org/10.17189/1522849), which resolves to the PDS bundle page listing https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/ |
| Download URL | https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/ (same archive path) |
| Usage terms | The PDS asks users to cite the data they use: "Citing PDS4 Data", https://pds.nasa.gov/datastandards/citing/ |
| Accessed | 2026-11-14 |
| Used for | Typical conditions by season and local hour: `data/meda_summary.json` (built by `preprocessing/build_meda_summary.py` from every 12th sol between sols 10 and 1850; 148 sols with data) |

Details taken from the bundle itself:

- **Season (solar longitude, Ls)** of each sol: the `mars2020:start_solar_longitude` and
  `mars2020:stop_solar_longitude` values in the official PDS4 label of each sol's derived
  pressure product.
- **Air temperature sensors**: ATS 1–3 are mounted on the Remote Sensing Mast and ATS 4–5 on the
  rover body (MEDA RDR Software Interface Specification, `document/meda_env_rdr_sis.pdf` in the
  bundle). MarsWalk uses ATS 1–3.
- **Wind**: MEDA release notes (`document/meda_release_notes.txt` in the bundle): "wind data
  beyond sol 315 is not provided due to certain damage to some components of the wind sensor,
  as a result of harsh weather conditions."

### Perseverance traverse path (habitat location)

| | |
|---|---|
| Mission | Mars 2020 Perseverance |
| Source | NASA Mars Trek (NASA/JPL) feature service "Perseverance_Traverse_Path": https://trek.nasa.gov/mars/trekarcgis/rest/services/Perseverance_Traverse_Path/MapServer/0 (332 drive segments, sols 14–1176 at access time) |
| Usage terms | JPL image and data use policy, https://www.jpl.nasa.gov/imagepolicy: credit line "Courtesy NASA/JPL-Caltech" unless otherwise noted |
| Accessed | 2026-11-15 |
| Used for | `data/perseverance_traverse.geojson`, `data/traverse_validation.json` and `data/traverse_preview.png` (built by `preprocessing/build_traverse.py`). The proposed habitat is the start of the earliest drive (sol 14), i.e. the landing site, in `data/candidate_sites.json`. NASA names the landing site "Octavia E. Butler" (NASA Science, "Perseverance's Route to the Delta", https://science.nasa.gov/photojournal/perseverances-route-to-the-delta-2/) |

### NASA Mars Trek Jezero points of interest (candidate science stops)

| | |
|---|---|
| Source | NASA Mars Trek (NASA/JPL) feature services behind two Jezero bookmarks: "Jezero Crater Features and Landforms" (`mars2020_waypoints`) and "Perseverance Landing Site", the Mastcam-Z tour (`mastcam_z_waypoints`) |
| URLs | https://trek.nasa.gov/mars/trekarcgis/rest/services/mars2020_waypoints/MapServer/0 and https://trek.nasa.gov/mars/trekarcgis/rest/services/mastcam_z_waypoints/MapServer/0; description pages under https://trek.nasa.gov/assets/bookmarks/mars/ |
| Usage terms | JPL image and data use policy, https://www.jpl.nasa.gov/imagepolicy: credit line "Courtesy NASA/JPL-Caltech" unless otherwise noted |
| Accessed | 2026-11-15 |
| Used for | `data/candidate_sites.json` (built by `preprocessing/build_candidate_sites.py`): names, coordinates and the first sentences of each NASA description, checked against the cost grid |

### Curiosity RAD surface radiation dose (reference value)

| | |
|---|---|
| Mission / instrument | Mars Science Laboratory (Curiosity rover), Radiation Assessment Detector (RAD) |
| Product | Published dose rate: "about 210 micrograys per day" (absorbed dose), "almost entirely due to galactic cosmic rays", first 10 months on the surface (August 2012 – June 2013), Gale crater |
| Source | NASA Photojournal PIA17600, "Radiation Measurements on Mars", credit NASA/JPL-Caltech/SwRI (2013-12-09): https://science.nasa.gov/photojournal/radiation-measurements-on-mars/ |
| Usage terms | Credit NASA/JPL-Caltech/SwRI, as given on the image page; JPL image policy, https://www.jpl.nasa.gov/imagepolicy |
| Accessed | 2026-11-14 |
| Used for | Radiation context for an EVA: `data/radiation_context.json`. Measured in Gale crater, not Jezero: NASA's list of Perseverance science instruments (see *Reference facts*) has no radiation detector |

## Reference facts

Facts quoted in the README, the data files or the app, with their source.

| Fact | Source |
|---|---|
| Perseverance landed on February 18, 2021 | NASA Science, "Perseverance and the Search Amongst the Sand" (2021-12-22): https://science.nasa.gov/blog/perseverance-and-the-search-amongst-the-sand/ |
| Séítah is "an exposure of rock and sand"; it "was considered too sandy and rocky for a safe landing"; its rocks "are mostly comprised of the mineral olivine" | Same NASA Science page |
| Landing site name "Octavia E. Butler" | NASA Science, "Perseverance's Route to the Delta": https://science.nasa.gov/photojournal/perseverances-route-to-the-delta-2/ |
| Perseverance science instruments: Mastcam-Z, MEDA, MOXIE, PIXL, RIMFAX, SHERLOC, SuperCam | NASA Science, "Perseverance Science Instruments": https://science.nasa.gov/mission/mars-2020-perseverance/science-instruments/ |
| Curiosity "has been exploring Gale Crater since 2012" | NASA Science, Mars Science Laboratory: Curiosity Rover: https://science.nasa.gov/mission/msl-curiosity/ |
| Jezero crater IAU name center 18.4082° N, 77.6873° E | IAU planetary nomenclature record "Jezero", served by NASA Mars Trek |
| Surface gravity: Mars 3.73 m/s² (mean), Moon 1.62 m/s², Earth 9.80–9.82 m/s² | NASA NSSDC fact sheets: https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html and https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html |
| Mars equatorial radius 3,396.2 km | NASA NSSDC Mars fact sheet (same value as the DEM sphere, 3,396,190 m) |
| Leaflet `L.circle` uses Earth's radius, 6,371,000 m | Leaflet 1.9.4 source code, `src/geo/crs/CRS.Earth.js` and `src/layer/vector/Circle.js` |

## Planned datasets (not used yet)

Listed so the citation is ready when each one is integrated. Move an entry to "Datasets in use"
and complete its URL, usage terms and access date when it is added.

| Dataset | Mission / instrument | Source | Planned use |
|---|---|---|---|
| MRO HiRISE, Jezero Mosaic, Controlled | MRO / HiRISE | NASA Mars Trek WMTS | High-resolution detail near the route |
| Geologic map of Jezero crater and Nili Planum (Sun & Stack, 2020, USGS SIM 3464) | — | USGS-NASA Planetary Geologic Mapping Program, doi:[10.3133/sim3464](https://doi.org/10.3133/sim3464) | Choosing stops by geologic unit |
| Perseverance raw images (credit NASA/JPL-Caltech) | Mars 2020 cameras | https://mars.nasa.gov/mars2020/multimedia/raw-images/ | Real photo at each stop |

## References for route parameters

| Parameter | Reference | Status |
|---|---|---|
| `s_max` = 20° | Scoville, "Artemis III EVA Mission Capability for de Gerlache-Shackleton Ridge", NASA NTRS 20210026296, slide 4 (citing NASA requirement HLS-S-R-0071): "Astronaut in suit must be able to walk up, down, across a 20-degree slope." https://ntrs.nasa.gov/citations/20210026296 | Verified 2026-11-15 |
| `s_block` = 15° | Peña-Asensio et al. (2023), *Acta Astronautica*, doi:[10.1016/j.actaastro.2023.10.010](https://doi.org/10.1016/j.actaastro.2023.10.010): "We adopt thresholds for (1) encountered slopes being <15°, which is conservative because 20° is considered a permissible limit" (lunar traverses). Supports both the 20° limit and the 15° margin | Verified by a team member reading the paper, 2026-11-15 |
| `walk_back_km` = 10 km | Vos, J. R., Gernhardt, M. L. and Lee, L. (2007), "The Walkback Test: A Study to Evaluate Suit and Life Support System Performance Requirements for a 10 Kilometer Traverse in a Planetary Suit", NASA Johnson Space Center, NTRS 20070016007: "It has been assumed, based on Apollo program experience, that 10 kilometers (6.2 mi) will be the maximum EVA excursion distance from the lander or habitat to ensure the crew member's safe return to the habitat in the event of a rover failure." https://ntrs.nasa.gov/citations/20070016007 | Verified 2026-11-15 |
| `vel_kmh` = 3.4 km/h | Cavagna, G. A., Willems, P. A. and Heglund, N. C. (1998), "Walking on Mars", *Nature* 393, 636, doi:[10.1038/31374](https://doi.org/10.1038/31374). Abstract (NASA ADS, 1998Natur.393..636C): "The optimal walking speed on Mars will be 3.4 km h-1 (down from 5.5 km h-1 on Earth)". Measured onboard an aircraft flying reduced-gravity profiles, without a spacesuit | Abstract checked by a team member, 2026-11-15. Replaces the Bellcomm 3.3 km/h value, whose link returns 404 |
| `eva_limit_h` = 6 h | Scoville, NASA NTRS 20210026296, slide 4: "Nominal EVA excursion is 6 hours +/- 2 hours" | Verified 2026-11-15 |

The slope, walk-back and EVA-duration references concern the Moon (Apollo or Artemis). The walking speed is for Mars gravity but without a spacesuit.

## Not verified (do not use until verified)

Found in earlier drafts. They may be correct, but nobody on the team has checked them against
the source yet, so they must not appear in the app, briefings or pitch until they are verified
and moved to the sections above.

| Reference | Used for in the drafts |
|---|---|
| Hassler, D. M. et al. (2014), *Science* 343, doi:10.1126/science.1244797 (0.64 mSv/day) | Radiation dose equivalent. The app uses the verified NASA value of about 210 µGy/day instead |
| Goudge, T. A. et al. (2015), *JGR Planets*, doi:10.1002/2014JE004782 | Fe/Mg smectite clays in the delta (CRISM) |
| Horgan, B. H. N. et al. (2020), *Icarus* 339, doi:10.1016/j.icarus.2019.113526 | Marginal carbonates (CRISM) |
| https://mars.nasa.gov/mars2020/mission/science/landing-site/ | Landing site overview |

## Software

Licenses as declared in each package's metadata (versions used for preprocessing).

| Library | Version | License | Used in |
|---|---|---|---|
| NumPy | 2.5.3 | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 | Preprocessing |
| Rasterio | 1.5.2 | BSD-3-Clause | Preprocessing |
| certifi | 2026.10.18 | MPL-2.0 | Preprocessing (TLS root certificates for the PDS download) |
| Leaflet | 1.9.4 | BSD-2-Clause (npm package metadata) | Web app: map |
| Chart.js | 4.4.1 | MIT (npm package metadata) | Web app: elevation profile |
| Matplotlib | 3.11.2 | Matplotlib license (classified as OSI Approved :: Python Software Foundation License) | Preprocessing preview and overlays |
