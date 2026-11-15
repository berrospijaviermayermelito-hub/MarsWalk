// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – app.js
// Boot sequence: load the team data in data/, place habitat and stops,
// plan the EVA with web/route.js (A* on the cost grid) and draw it.
// No sample values: a missing file shows an error state instead.
// ═══════════════════════════════════════════════════════════════════════

(function () {
  var ui = MW.ui, CFG = window.MW_CONFIG, D = CFG.DATA;

  ui.setStatus("tiles", "loading", "Loading base map…");
  ui.setStatus("data", "loading", "Loading data…");
  ui.setStatus("route", "loading", "Computing route…");

  var R = window.MarsWalkRoute;
  var planner = R
    ? R.init(D.base, { speedKmh: CFG.PARAMS.vel_kmh.value, walkBackKm: CFG.PARAMS.walk_back_km.value })
        .then(function () { return true; }, function (e) { console.error("route.js init failed:", e); return false; })
    : Promise.resolve(false);

  Promise.all([
    ui.loadJSON(D.stops),
    ui.loadJSON(D.meda),
    ui.loadJSON(D.costGrid),
    ui.loadJSON(D.radiation),
    planner,
  ]).then(function (res) {
    var stops = res[0], meda = res[1], grid = res[2], rad = res[3], plannerOk = res[4];

    var missing = [];
    [[stops, "stops.json"], [meda, "meda_summary.json"], [grid, "cost_grid.json"], [rad, "radiation_context.json"]]
      .forEach(function (p) { if (!p[0].ok) missing.push(p[1]); });

    if (grid.ok) { MW.costGrid = grid.data; MW.setCostGrid(grid.data); }

    if (meda.ok) MW.briefing.setupConditions(meda.data);
    else MW.briefing.conditionsUnavailable("Typical conditions unavailable: data/meda_summary.json could not be loaded.");

    if (rad.ok) MW.briefing.setRadiation(rad.data);

    ui.setStatus("data", missing.length ? "err" : "ok", missing.length ? "Missing: " + missing.join(", ") : "NASA data loaded");
    if (missing.length) {
      ui.showError("data", "Could not load " + missing.join(", ") + " from data/. Serve the repository root (python3 -m http.server) and open /web/.");
    }

    if (!stops.ok) {
      ui.setStatus("route", "err", "No route (stops missing)");
      MW.finishControls();
      return;
    }
    MW.setHabitat(stops.data.habitat);
    MW.setStops(stops.data.stops, function (s) { MW.briefing.showStop(s); });
    drawPlannedRoute(plannerOk);
    MW.finishControls();
    MW.fitRoute();
  }).catch(function (err) {
    console.error(err);
    ui.setStatus("route", "err", "No route");
    ui.showError("boot", "The app could not start: " + err.message);
  });

  /** Habitat → A → B → C → habitat with the A* planner of web/route.js. */
  function drawPlannedRoute(plannerOk) {
    if (!plannerOk) {
      ui.setStatus("route", "err", "Route planner unavailable");
      ui.showError("route", "The route planner (web/route.js) could not load the terrain data.");
      return;
    }
    var hab = MW.getHabitat().latlng;
    var pts = [hab].concat(MW.getStops().map(function (s) { return s.latlng; })).concat([hab]);
    var r = R.findPathVia(pts, hab);
    if (r.blocked) {
      ui.setStatus("route", "err", "No safe route found");
      ui.showError("route", "No safe route between the stops (" + r.reason + (r.failed_leg !== undefined ? ", leg " + r.failed_leg : "") + ").");
      return;
    }
    MW.drawRoute(r.path, {
      label: "A* safest route",
      distance_km: r.distance_km,
      max_distance_from_habitat_km: r.max_distance_from_habitat_km,
      elevations_m: r.elevations_m.length === r.path.length ? r.elevations_m : null,
    });
  }
})();
