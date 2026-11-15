// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – config.js
// Single place for parameters, layer definitions and data sources.
// Values follow docs/TEAM_RULES.md (frozen decisions); every source is
// listed in DATA_SOURCES.md. Nothing here may be shown without a source.
// ═══════════════════════════════════════════════════════════════════════

var TREK = "https://trek.nasa.gov/tiles/Mars/EQ/";
var TREK_SUFFIX = "/1.0.0/default/default028mm/{z}/{y}/{x}";
var CTX_ID = "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0";

window.MW_CONFIG = {
  // ── Work area: western Jezero crater ─────────────────────────────────
  CENTER: [18.44463, 77.45089],
  INITIAL_ZOOM: 11,
  MAX_ZOOM: 16,
  // Mars 2020 IAU sphere used by the DEM (body_radius_m in data/*.json).
  MARS_RADIUS_KM: 3396.19,

  // Team data (relative to web/). The app does not run on sample values.
  DATA: {
    base: "../data",
    costGrid: "../data/cost_grid.json",
    meda: "../data/meda_summary.json",
    stops: "../data/stops.json",
    radiation: "../data/radiation_context.json",
  },

  // ── Route parameters (docs/TEAM_RULES.md §3, sources in DATA_SOURCES.md) ─
  PARAMS: {
    s_max_deg: { value: 20, unit: "°", label: "Max walkable slope", source: "NASA requirement HLS-S-R-0071, in Scoville, NTRS 20210026296" },
    s_block_deg: { value: 15, unit: "°", label: "Blocked above (CTX slope)", source: "Peña-Asensio et al. (2023), Acta Astronautica" },
    walk_back_km: { value: 10, unit: "km", label: "Walk-back radius", source: "Vos, Gernhardt & Lee (2007), NASA JSC, NTRS 20070016007" },
    vel_kmh: { value: 3.4, unit: "km/h", label: "Walking speed (Mars gravity)", source: "Cavagna, Willems & Heglund (1998), Nature 393, 636" },
    eva_limit_h: { value: 6, unit: "h", label: "EVA time limit", source: "Scoville, NTRS 20210026296: nominal EVA 6 h ± 2 h" },
  },

  // No published value: a planning input the user sets, never shown as a fact.
  STOP_MIN_DEFAULT: 0,

  // ── Map layers (Mars Trek WMTS, equirectangular, top-left tile origin) ─
  BASE_LAYERS: {
    viking: {
      name: "Viking color mosaic (global)",
      url: TREK + "Mars_Viking_MDIM21_ClrMosaic_global_232m" + TREK_SUFFIX + ".jpg",
      maxNativeZoom: 7,
    },
    ctx: {
      name: "CTX 6 m – Jezero (MRO)",
      url: TREK + CTX_ID + TREK_SUFFIX + ".png",
      // Offline copy kept by the data team (same layout as Mars Trek).
      fallbackUrl: "../data/tiles/" + CTX_ID + TREK_SUFFIX + ".png",
      bounds: [[18.2110274, 77.1604655], [18.7211945, 77.6991776]],
      maxNativeZoom: 13,
    },
    hirise: {
      name: "HiRISE 25 cm – Jezero (MRO)",
      url: TREK + "JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd" + TREK_SUFFIX + ".png",
      bounds: [[18.3067994, 77.2229331], [18.669315, 77.583964]],
      maxNativeZoom: 17,
    },
  },

  OVERLAYS: {
    mola: {
      name: "Elevation – MOLA color hillshade (MGS)",
      url: TREK + "Mars_MGS_MOLA_ClrShade_merge_global_463m" + TREK_SUFFIX + ".jpg",
      maxNativeZoom: 7,
      opacity: 0.55,
    },
    themis: {
      name: "Night thermal IR – THEMIS (Mars Odyssey)",
      url: TREK + "THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018" + TREK_SUFFIX + ".png",
      maxNativeZoom: 9,
      opacity: 0.6,
    },
  },

  // ── Data sources shown in the app (summary of DATA_SOURCES.md) ───────
  SOURCES: [
    { what: "Base map – CTX orthomosaic of Jezero (6 m/px)", mission: "Mars Reconnaissance Orbiter", instrument: "CTX", url: "https://doi.org/10.5066/P9GV1ND3" },
    { what: "Base map – HiRISE orthomosaic of Jezero (25 cm/px)", mission: "Mars Reconnaissance Orbiter", instrument: "HiRISE", url: "https://trek.nasa.gov/mars/" },
    { what: "Elevation, slope and blocked terrain (CTX DTM, 20 m/px)", mission: "Mars Reconnaissance Orbiter", instrument: "CTX", url: "https://doi.org/10.5066/P906QQT8" },
    { what: "Global context color mosaic", mission: "Viking", instrument: "MDIM21", url: "https://trek.nasa.gov/mars/" },
    { what: "Elevation (color hillshade)", mission: "Mars Global Surveyor", instrument: "MOLA", url: "https://trek.nasa.gov/mars/" },
    { what: "Night thermal infrared mosaic", mission: "Mars Odyssey", instrument: "THEMIS", url: "https://trek.nasa.gov/mars/" },
    { what: "Typical weather: temperature, pressure, wind", mission: "Mars 2020 Perseverance", instrument: "MEDA", url: "https://doi.org/10.17189/1522849" },
    { what: "Radiation dose context (Gale crater)", mission: "Mars Science Laboratory Curiosity", instrument: "RAD", url: "https://science.nasa.gov/photojournal/radiation-measurements-on-mars/" },
    { what: "Habitat and science stops (points of interest)", mission: "Mars 2020 Perseverance", instrument: "NASA Mars Trek", url: "https://trek.nasa.gov/mars/" },
  ],
};
