// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – sample-data.js
// SAMPLE data used ONLY when the team files in data/ are not available yet.
// The UI flags it with a "Sample data" badge. Replace with real outputs:
//   data/stops.json         (science team)
//   data/meda_summary.json  (data team, from Perseverance MEDA)
// Stop coordinates are placeholders – TODO: confirm with science team.
// ═══════════════════════════════════════════════════════════════════════

window.MW_SAMPLE = {
  habitat: {
    name: "Habitat (fictional)",
    latlng: [18.4386, 77.4508],
    note: "Fictional base on the crater floor, near the Perseverance landing site.",
  },

  stops: [
    {
      id: "A",
      name: "Delta front – layered rocks",
      latlng: [18.48, 77.41],
      mineral: "Sedimentary layers",
      instrument: "MRO HiRISE / CTX",
      briefing:
        "Stacked layers at the front of Jezero's western delta, deposited by a river " +
        "flowing into a lake more than 3.5 billion years ago. Each layer is a page of " +
        "the lake's history: look for changes in grain size and color between beds.",
      task: "Photograph the layer sequence and collect one fine-grained sample.",
      source_url: "https://mars.nasa.gov/mars2020/mission/science/landing-site/",
    },
    {
      id: "B",
      name: "Delta clays – Fe/Mg smectite",
      latlng: [18.50, 77.44],
      mineral: "Fe/Mg smectite clay",
      instrument: "MRO CRISM",
      briefing:
        "Orbital spectra show iron- and magnesium-rich clays carried into the lake by " +
        "the river. Clays form in liquid water and are good at trapping and preserving " +
        "organic molecules.",
      task: "Sample the finest-grained clay-bearing layer.",
      source_url: "https://doi.org/10.1002/2014JE004782",
    },
    {
      id: "C",
      name: "Lake margin – carbonates",
      latlng: [18.51, 77.47],
      mineral: "Carbonates",
      instrument: "MRO CRISM",
      briefing:
        "Carbonate-bearing rocks detected from orbit along the inner edge of the crater, " +
        "possibly formed at the shoreline of the ancient lake. On Earth, similar " +
        "shoreline carbonates can record traces of past life.",
      task: "Look for fine laminations or textures; collect one sample.",
      source_url: "https://doi.org/10.1016/j.icarus.2019.113526",
    },
  ],

  // Illustrative values ONLY (not MEDA measurements).
  meda: {
    source: "SAMPLE – illustrative values, not MEDA data",
    hours: ["06:00", "09:00", "12:00", "15:00", "18:00"],
    seasons: {
      "Northern spring (Ls 0–90)": {
        "06:00": { temp_c: -78, dust_tau: 0.45 },
        "09:00": { temp_c: -50, dust_tau: 0.45 },
        "12:00": { temp_c: -22, dust_tau: 0.45 },
        "15:00": { temp_c: -18, dust_tau: 0.45 },
        "18:00": { temp_c: -45, dust_tau: 0.45 },
      },
      "Northern summer (Ls 90–180)": {
        "06:00": { temp_c: -75, dust_tau: 0.4 },
        "09:00": { temp_c: -45, dust_tau: 0.4 },
        "12:00": { temp_c: -18, dust_tau: 0.4 },
        "15:00": { temp_c: -15, dust_tau: 0.4 },
        "18:00": { temp_c: -42, dust_tau: 0.4 },
      },
      "Northern autumn (Ls 180–270)": {
        "06:00": { temp_c: -82, dust_tau: 0.8 },
        "09:00": { temp_c: -58, dust_tau: 0.8 },
        "12:00": { temp_c: -28, dust_tau: 0.85 },
        "15:00": { temp_c: -25, dust_tau: 0.85 },
        "18:00": { temp_c: -52, dust_tau: 0.8 },
      },
      "Northern winter (Ls 270–360)": {
        "06:00": { temp_c: -88, dust_tau: 1.1 },
        "09:00": { temp_c: -65, dust_tau: 1.05 },
        "12:00": { temp_c: -35, dust_tau: 1.0 },
        "15:00": { temp_c: -30, dust_tau: 1.0 },
        "18:00": { temp_c: -60, dust_tau: 1.05 },
      },
    },
  },

  // Demo route (hand-drawn polyline). TODO: replace with A* output from route.js.
  route: [
    [18.4386, 77.4508],
    [18.44, 77.45],
    [18.45, 77.43],
    [18.48, 77.41],
    [18.49, 77.42],
    [18.50, 77.44],
    [18.505, 77.455],
    [18.51, 77.47],
    [18.49, 77.468],
    [18.465, 77.46],
    [18.4386, 77.4508],
  ],
};
