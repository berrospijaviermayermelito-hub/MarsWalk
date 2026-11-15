// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – profile.js
// Elevation profile of the current route (Chart.js, MIT license).
// Elevation comes from web/route.js (heights from data/heights.json, CTX DTM).
// ═══════════════════════════════════════════════════════════════════════

(function () {
  var ui = MW.ui;
  var chart = null;

  function setEmpty(msg) {
    ui.$("profile-empty").textContent = msg;
    ui.$("profile-empty").hidden = false;
    ui.$("profile-canvas").hidden = true;
    ui.$("profile-stats").textContent = "";
  }

  function render(route) {
    if (typeof Chart === "undefined") {
      setEmpty("Chart library failed to load (offline?).");
      return;
    }

    if (!route.elevations || route.elevations.length !== route.coords.length) {
      setEmpty("No elevation data for this route.");
      return;
    }
    var pts = route.coords, elev = route.elevations;

    var cum = MW.cumulativeKm(pts);
    var data = [], minE = Infinity, maxE = -Infinity, gain = 0, prev = null;
    pts.forEach(function (_, i) {
      var e = elev[i];
      if (e === null || e === undefined || isNaN(e)) return;
      data.push({ x: +cum[i].toFixed(3), y: e });
      minE = Math.min(minE, e); maxE = Math.max(maxE, e);
      if (prev !== null && e > prev) gain += e - prev;
      prev = e;
    });
    if (!data.length) { setEmpty("No elevation data along this route."); return; }

    ui.$("profile-empty").hidden = true;
    ui.$("profile-canvas").hidden = false;
    ui.$("profile-stats").textContent =
      "Min " + Math.round(minE) + " m · Max " + Math.round(maxE) + " m · Climb +" + Math.round(gain) + " m";

    var css = getComputedStyle(document.documentElement);
    var muted = css.getPropertyValue("--muted").trim();
    var grid = css.getPropertyValue("--border").trim();

    if (chart) chart.destroy();
    chart = new Chart(ui.$("profile-canvas"), {
      type: "line",
      data: {
        datasets: [
          { data: data, borderColor: "#3ddc84", backgroundColor: "rgba(61,220,132,0.12)", fill: true, pointRadius: 0, borderWidth: 2, tension: 0.2 },
          { data: [], pointRadius: 6, pointBackgroundColor: "#fff", pointBorderColor: "#4fa0ff", pointBorderWidth: 3, showLine: false },
        ],
      },
      options: {
        animation: false,
        maintainAspectRatio: false,
        parsing: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          title: function (it) { return it[0].parsed.x.toFixed(2) + " km"; },
          label: function (it) { return Math.round(it.parsed.y) + " m"; },
        } } },
        scales: {
          x: { type: "linear", min: 0, max: data[data.length - 1].x, title: { display: true, text: "Distance (km)", color: muted }, ticks: { color: muted }, grid: { color: grid } },
          y: { title: { display: true, text: "Elevation (m)", color: muted }, ticks: { color: muted }, grid: { color: grid } },
        },
      },
    });
  }

  /** Move the "you are here" dot along the profile (EVA mode). */
  function setCursor(km) {
    if (!chart) return;
    var d = chart.data.datasets[0].data, best = null;
    d.forEach(function (p) { if (!best || Math.abs(p.x - km) < Math.abs(best.x - km)) best = p; });
    chart.data.datasets[1].data = best ? [best] : [];
    chart.update("none");
  }

  document.addEventListener("mw:route", function (e) { render(e.detail); });
  MW.profile = { setCursor: setCursor };
})();
