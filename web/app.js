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
    // Load the A* planner data (web/route.js) before drawing the route.
    window.MarsWalkRoute ? window.MarsWalkRoute.init("../data").catch(function (e) {
      console.warn("route.js init failed:", e);
      return null;
    }) : null,
  ]).then(function (res) {
    var stopsRes = res[0], medaRes = res[1], gridRes = res[2];

    // Accept either { habitat, stops: [...] } or a bare array of stops.
    var stopsData = Array.isArray(stopsRes.data) ? { habitat: S.habitat, stops: stopsRes.data } : stopsRes.data;

    MW.costGrid = gridRes.sample ? null : gridRes.data;
    // data/cost_grid.json keeps rows, cols and bounds in its "meta" block (see README,
    // "Data format"). Copy them to the top level, where map.js reads them. Blocked cells
    // use the blocking threshold s_block_deg from the data (docs/TEAM_RULES.md).
    if (MW.costGrid && MW.costGrid.meta) {
      var gm = MW.costGrid.meta, gb = gm.bounds_deg;
      MW.costGrid.rows = gm.rows;
      MW.costGrid.cols = gm.cols;
      MW.costGrid.bounds = [[gb.south, gb.west], [gb.north, gb.east]];
      MW.costGrid.s_max_deg = gm.s_block_deg;
    }
    if (MW.costGrid) MW.setCostGrid(MW.costGrid);

    MW.setHabitat(stopsData.habitat || S.habitat);
    MW.setStops(stopsData.stops, function (s) { MW.briefing.showStop(s); });
    if (medaRes.data && medaRes.data.ls_bins) {
      // data/meda_summary.json uses the format described in the README ("Data format");
      // the conditions panel still expects the old sample format. Integration pending
      // (docs/TEAM_RULES.md, open items).
      document.getElementById("cond-loading").textContent =
        "Typical conditions: connection to data/meda_summary.json pending.";
    } else {
      MW.briefing.setupConditions(medaRes);
    }

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
          var leg = R.findPath(waypoints[i - 1], waypoints[i], hab);
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
