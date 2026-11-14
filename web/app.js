// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – app.js
// Boot sequence: load team data (or sample data), place habitat and stops,
// draw the route (route.js A* if available, else the preloaded demo route).
// ═══════════════════════════════════════════════════════════════════════

(function () {
  var ui = MW.ui, CFG = window.MW_CONFIG, S = window.MW_SAMPLE;

  ui.setStatus("tiles", "loading", "Loading base map…");
  ui.setStatus("data", "loading", "Loading data…");
  ui.setStatus("route", "loading", "Computing route…");

  Promise.all([
    ui.loadJSON(CFG.DATA.stops, { habitat: S.habitat, stops: S.stops }),
    ui.loadJSON(CFG.DATA.meda, S.meda),
    ui.loadJSON(CFG.DATA.costGrid, null),
  ]).then(function (res) {
    var stopsRes = res[0], medaRes = res[1], gridRes = res[2];

    // Accept either { habitat, stops: [...] } or a bare array of stops.
    var stopsData = Array.isArray(stopsRes.data) ? { habitat: S.habitat, stops: stopsRes.data } : stopsRes.data;

    MW.costGrid = gridRes.sample ? null : gridRes.data;
    if (MW.costGrid) MW.setCostGrid(MW.costGrid);

    MW.setHabitat(stopsData.habitat || S.habitat);
    MW.setStops(stopsData.stops, function (s) { MW.briefing.showStop(s); });
    MW.briefing.setupConditions(medaRes);

    var missing = [];
    if (stopsRes.sample) missing.push("stops");
    if (medaRes.sample) missing.push("MEDA");
    if (!MW.costGrid) missing.push("cost grid");
    ui.setStatus("data", missing.length ? "warn" : "ok",
      missing.length ? "Sample data for: " + missing.join(", ") : "Team data loaded");

    drawInitialRoute();
    MW.finishControls();
    MW.fitRoute();
  }).catch(function (err) {
    console.error(err);
    ui.setStatus("data", "err", "Data failed to load");
    ui.setStatus("route", "err", "No route");
    ui.showError("boot", "The app could not start: " + err.message);
  });

  function drawInitialRoute() {
    var R = window.MarsWalkRoute;
    if (R && typeof R.findPath === "function" && MW.costGrid) {
      try {
        var hab = MW.getHabitat().latlng;
        var waypoints = [hab].concat(MW.getStops().map(function (s) { return s.latlng; })).concat([hab]);
        var path = [], elev = [];
        for (var i = 1; i < waypoints.length; i++) {
          var leg = R.findPath(waypoints[i - 1], waypoints[i], MW.costGrid);
          if (!leg || !leg.path || !leg.path.length) throw new Error("no path for leg " + i);
          path = path.concat(i > 1 ? leg.path.slice(1) : leg.path);
          if (leg.elevations_m) elev = elev.concat(i > 1 ? leg.elevations_m.slice(1) : leg.elevations_m);
        }
        MW.drawRoute(path, { label: "A* safest route", elevations_m: elev.length === path.length ? elev : null });
        return;
      } catch (e) {
        console.warn("route.js failed, using demo route:", e);
        ui.showError("route", "Route planner failed (" + e.message + "). Showing the preloaded demo route.");
      }
    }
    MW.drawRoute(S.route, { label: "Demo route" });
  }
})();
