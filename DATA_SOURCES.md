# Data sources

Every dataset, service and library used by MarsWalk. Keep this file in sync with
`SOURCES` in `web/config.js` (shown in the app under **Data sources**).

## NASA map layers (Mars Trek WMTS)

All tiles are served by NASA Solar System Treks – Mars Trek
(<https://trek.nasa.gov/mars/>, API docs: <https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars>).
Equirectangular projection (`EQ`), tile matrix set `default028mm`, top-left origin.
NASA data are public domain unless noted otherwise.

| Layer in the app | Mars Trek layer id | Mission / instrument | Resolution |
| --- | --- | --- | --- |
| CTX 6 m – Jezero | `JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0` | Mars Reconnaissance Orbiter / CTX (USGS Mars 2020 LVS map) | 6 m/px |
| HiRISE 25 cm – Jezero | `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd` | Mars Reconnaissance Orbiter / HiRISE (USGS Mars 2020 TRN basemap) | 25 cm/px |
| Viking color mosaic | `Mars_Viking_MDIM21_ClrMosaic_global_232m` | Viking Orbiters / VIS (MDIM 2.1) | 232 m/px |
| Elevation – MOLA shaded relief | `Mars_MGS_MOLA_ClrShade_merge_global_463m` | Mars Global Surveyor / MOLA | 463 m/px |
| Night thermal IR – THEMIS | `THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018` | Mars Odyssey / THEMIS | 100 m/px |

`web/tiles/ctx/` is a local copy of CTX tiles for the demo area, downloaded with
`web/tools/fetch_fallback_tiles.py`, used only if Mars Trek is unreachable.

## Surface conditions and radiation

| Data | Mission / instrument | Source |
| --- | --- | --- |
| Temperature, dust opacity (to be summarized in `data/meda_summary.json`) | Mars 2020 Perseverance / MEDA | PDS Atmospheres Node: <https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html> |
| Surface radiation dose, 0.64 mSv/day (Gale crater, used as a proxy for Jezero) | Mars Science Laboratory Curiosity / RAD | Hassler, D. M. et al. (2014). Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover. *Science* 343. <https://doi.org/10.1126/science.1244797> |

> Until `data/meda_summary.json` exists, the app shows **sample, illustrative values** and labels them "Sample data".

## Science targets

| Target | Instrument | Reference |
| --- | --- | --- |
| Fe/Mg smectite clays in the delta | MRO / CRISM | Goudge, T. A. et al. (2015). Assessing the mineralogy of the watershed and fan deposits of the Jezero crater paleolake system, Mars. *JGR Planets*. <https://doi.org/10.1002/2014JE004782> |
| Marginal carbonates | MRO / CRISM | Horgan, B. H. N. et al. (2020). The mineral diversity of Jezero crater: Evidence for possible lacustrine carbonates on Mars. *Icarus* 339. <https://doi.org/10.1016/j.icarus.2019.113526> |
| Jezero landing site overview | Mars 2020 | <https://mars.nasa.gov/mars2020/mission/science/landing-site/> |

Stop coordinates are placeholders until the science team confirms them.

## Parameters

| Parameter | Value | Source |
| --- | --- | --- |
| Mars mean radius | 3389.5 km | NASA Mars Fact Sheet: <https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html> |
| s_max (max walkable slope) | 15° | **Assumed value for demo** – source pending |
| walk_back_km | 10 km | **Assumed value for demo** – source pending |
| vel_kmh | 3 km/h | **Assumed value for demo** – source pending |
| Time per stop | 20 min | **Assumed value for demo** |
| EVA time limit | 6 h | **Assumed value for demo** – source pending |
| Traffic-light thresholds (temperature, dust) | see `web/config.js` | **Assumed values for demo** – source pending |

## Software libraries (OSI-approved licenses)

| Library | Version | License | Use |
| --- | --- | --- | --- |
| Leaflet | 1.9.4 | BSD-2-Clause | Map |
| Chart.js | 4.4.1 | MIT | Elevation profile |

## AI assistance

Parts of the code and documentation were written with the help of an AI assistant (Claude, Anthropic).
