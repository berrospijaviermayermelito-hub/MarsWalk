// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – config.js
// Single place for parameters, layer definitions and data sources.
// Every threshold must cite a source or be flagged as an assumed value.
// ═══════════════════════════════════════════════════════════════════════

var TREK = "https://trek.nasa.gov/tiles/Mars/EQ/";
var TREK_SUFFIX = "/1.0.0/default/default028mm/{z}/{y}/{x}";

window.MW_CONFIG = {
  // ── Work area: Jezero crater ─────────────────────────────────────────
  CENTER: [18.4386, 77.4508],
  INITIAL_ZOOM: 11,
  MAX_ZOOM: 16,
  MARS_RADIUS_KM: 3389.5, // mean radius, NASA Mars Fact Sheet

  // Paths to team data (produced by preprocessing/, relative to web/).
  DATA: {
    costGrid: "../data/cost_grid.json",
    meda: "../data/meda_summary.json",
    stops: "../data/stops.json",
  },

  // ── Safety parameters ────────────────────────────────────────────────
  // `source: null` means "assumed value for demo" and is shown as such in the UI.
  PARAMS: {
    s_max_deg: { value: 15, unit: "°", label: "Max walkable slope", source: null },
    walk_back_km: { value: 10, unit: "km", label: "Walk-back radius", source: null },
    vel_kmh: { value: 3, unit: "km/h", label: "Walking speed", source: null },
    stop_min: { value: 20, unit: "min", label: "Time at each stop", source: null },
    eva_limit_h: { value: 6, unit: "h", label: "EVA time limit", source: null },
  },

  // Traffic-light thresholds (assumed values for demo until cited).
  CONDITIONS: {
    temp_c: { green_min: -60, amber_min: -80, source: null },   // below amber_min → red
    dust_tau: { green_max: 0.6, amber_max: 1.0, source: null }, // above amber_max → red
    // Average surface dose measured by MSL/RAD at Gale crater (not Jezero).
    radiation_msv_day: {
      value: 0.64,
      source: "Hassler et al. (2014), Science 343, MSL RAD – Gale crater",
    },
  },

  // ── Map layers (Mars Trek WMTS, equirectangular, top-left tile origin) ─
  BASE_LAYERS: {
    viking: {
      name: "Viking color mosaic (global)",
      url: TREK + "Mars_Viking_MDIM21_ClrMosaic_global_232m" + TREK_SUFFIX + ".jpg",
      maxNativeZoom: 7,
    },
    ctx: {
      name: "CTX 6 m – Jezero (MRO)",
      url: TREK + "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0" + TREK_SUFFIX + ".png",
      fallbackUrl: "tiles/ctx/{z}/{y}/{x}.png",
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
      name: "Elevation – MOLA shaded relief (MGS)",
      url: TREK + "Mars_MGS_MOLA_ClrShade_merge_global_463m" + TREK_SUFFIX + ".jpg",
      maxNativeZoom: 7,
      opacity: 0.55,
    },
    themis: {
      name: "Night thermal IR – THEMIS (Mars Odyssey)",
      url: TREK + "THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018" + TREK_SUFFIX + ".png",
      maxNativeZoom: 9,
      opacity: 0.6,
      hint: "Brighter = warmer at night = rockier / more consolidated ground",
    },
  },

  // ── Data sources shown in the app (keep in sync with DATA_SOURCES.md) ─
  SOURCES: [
    { what: "Base map – CTX orthomosaic of Jezero (6 m/px)", mission: "Mars Reconnaissance Orbiter", instrument: "CTX", url: "https://trek.nasa.gov/mars/" },
    { what: "Base map – HiRISE orthomosaic of Jezero (25 cm/px)", mission: "Mars Reconnaissance Orbiter", instrument: "HiRISE", url: "https://trek.nasa.gov/mars/" },
    { what: "Global context color mosaic", mission: "Viking Orbiters", instrument: "VIS (MDIM 2.1)", url: "https://trek.nasa.gov/mars/" },
    { what: "Elevation (shaded relief)", mission: "Mars Global Surveyor", instrument: "MOLA", url: "https://trek.nasa.gov/mars/" },
    { what: "Night thermal infrared (rock / dust proxy)", mission: "Mars Odyssey", instrument: "THEMIS", url: "https://trek.nasa.gov/mars/" },
    { what: "Surface weather (temperature, dust)", mission: "Mars 2020 Perseverance", instrument: "MEDA", url: "https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html" },
    { what: "Surface radiation dose", mission: "Mars Science Laboratory Curiosity", instrument: "RAD", url: "https://doi.org/10.1126/science.1244797" },
    { what: "Mineral targets (clays, carbonates)", mission: "Mars Reconnaissance Orbiter", instrument: "CRISM", url: "https://pds-geosciences.wustl.edu/missions/mro/crism.htm" },
  ],
};
