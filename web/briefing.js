// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – briefing.js
// Sidebar panels: route summary + safety checks, typical conditions (MEDA),
// radiation context (RAD), stop briefing card, guided EVA mode and the
// data-sources modal. Only sourced values are shown (docs/TEAM_RULES.md).
// ═══════════════════════════════════════════════════════════════════════

(function () {
  var ui = MW.ui, $ = ui.$, esc = ui.esc;
  var CFG = window.MW_CONFIG, P = CFG.PARAMS;

  // Planning input without a published source: set by the user, 0 by default.
  MW.stopMin = CFG.STOP_MIN_DEFAULT;

  var radiation = null; // data/radiation_context.json

  // ── Route summary & safety checks ────────────────────────────────────
  function evaHours(route) {
    return route.walkH + MW.getStops().length * MW.stopMin / 60;
  }

  function renderSummary(route) {
    var evaH = evaHours(route);
    var overTime = evaH > P.eva_limit_h.value;
    $("val-distance").textContent = route.totalKm.toFixed(2) + " km (round trip)";
    $("val-time").textContent = ui.fmtHours(evaH);
    $("val-time-detail").textContent =
      "Walking " + ui.fmtHours(route.walkH) + " @ " + P.vel_kmh.value + " km/h" +
      (MW.stopMin > 0 ? " + " + MW.getStops().length + " × " + MW.stopMin + " min at stops" : " (time at stops not included)");
    $("val-stops").textContent = MW.getStops().length + " science stops";

    var pct = Math.min(100, evaH / P.eva_limit_h.value * 100);
    var bar = $("eva-bar");
    bar.style.width = pct + "%";
    bar.className = "bar-fill " + (overTime ? "red" : pct > 80 ? "amber" : "green");
    $("eva-bar-label").textContent = Math.round(pct) + "% of the " + P.eva_limit_h.value + " h nominal EVA";

    var sBlock = MW.costGrid ? MW.costGrid.meta.s_block_deg : P.s_block_deg.value;
    var checks = [
      {
        ok: !route.outsideWalkBack,
        text: route.outsideWalkBack
          ? "Route goes " + route.maxFromHabKm.toFixed(1) + " km from the habitat – beyond the " + P.walk_back_km.value + " km walk-back limit"
          : "Always within " + P.walk_back_km.value + " km walk-back radius (max " + route.maxFromHabKm.toFixed(1) + " km)",
      },
      {
        ok: !overTime,
        text: overTime ? "EVA exceeds the " + P.eva_limit_h.value + " h nominal duration" : "EVA fits within the " + P.eva_limit_h.value + " h nominal duration",
      },
      {
        ok: route.slopeChecked && !route.crossesBlocked,
        warn: !route.slopeChecked,
        text: !route.slopeChecked
          ? "Slope check unavailable (cost_grid.json not loaded)"
          : route.crossesBlocked
            ? "Route crosses blocked terrain (CTX slope > " + sBlock + "°, red dots)"
            : "No blocked terrain on the route (max CTX slope " + (route.maxSlopeDeg || 0).toFixed(1) + "°, blocked above " + sBlock + "°)",
      },
    ];
    $("safety-checks").innerHTML = checks.map(function (c) {
      var cls = c.warn ? "warn" : c.ok ? "ok" : "err";
      var icon = c.warn ? "!" : c.ok ? "✓" : "✕";
      return '<li class="' + cls + '"><span>' + icon + "</span>" + esc(c.text) + "</li>";
    }).join("");

    renderRadiation(evaH);
  }

  function renderParams() {
    $("params").innerHTML = Object.keys(P).map(function (k) {
      var p = P[k];
      return "<li><span>" + esc(p.label) + "</span><b>" + p.value + " " + esc(p.unit) + "</b>" + ui.sourceTag(p.source) + "</li>";
    }).join("") +
      '<li><span>Time at each stop</span><input type="number" id="in-stop-min" min="0" max="240" step="5" value="' + MW.stopMin +
      '" aria-label="Time at each stop in minutes"> min<span class="tag input" title="No published value: set your own planning time">your input</span></li>';
    $("in-stop-min").oninput = function () {
      var v = parseFloat(this.value);
      MW.stopMin = isNaN(v) || v < 0 ? 0 : Math.min(v, 240);
      if (MW.getRoute()) renderSummary(MW.getRoute());
    };
  }

  // ── Radiation context (not a traffic light) ──────────────────────────
  function setRadiation(r) {
    radiation = r;
    if (MW.getRoute()) renderRadiation(evaHours(MW.getRoute()));
  }

  function renderRadiation(evaH) {
    var box = $("radiation");
    if (!radiation) { box.innerHTML = '<p class="empty">Radiation data unavailable.</p>'; return; }
    var rate = radiation.absorbed_dose_rate_ugy_per_hour;
    box.innerHTML =
      '<p class="rad-value"><b>≈ ' + Math.round(rate * evaH) + " µGy</b> absorbed dose for this EVA</p>" +
      '<p class="caption">' + rate + " µGy/h × " + evaH.toFixed(1) + " h. Reference rate measured by Curiosity RAD in Gale crater " +
      "(about " + radiation.absorbed_dose_rate_ugy_per_day + " µGy per day, mostly galactic cosmic rays), not at Jezero. " +
      "Absorbed dose, not a forecast; solar particle events not included.</p>" +
      '<a class="src" href="' + esc(radiation.meta.source_url) + '" target="_blank" rel="noopener">Source: NASA PIA17600 →</a>';
  }

  // ── Typical conditions (MEDA) ────────────────────────────────────────
  var meda = null;
  var VARS = [
    { key: "air_temp_c", label: "Air temperature", unit: "°C", digits: 0 },
    { key: "ground_temp_c", label: "Ground temperature", unit: "°C", digits: 0 },
    { key: "pressure_pa", label: "Pressure", unit: "Pa", digits: 0 },
    { key: "wind_speed_ms", label: "Wind speed", unit: "m/s", digits: 1 },
  ];

  function setupConditions(data) {
    meda = data;
    $("sel-season").innerHTML = meda.ls_bins.map(function (b, i) {
      return '<option value="' + i + '">' + esc(b.season) + " (Ls " + b.ls_start + "–" + b.ls_end + "°)</option>";
    }).join("");
    var hours = [];
    for (var h = 0; h < 24; h++) hours.push('<option value="' + h + '">' + (h < 10 ? "0" : "") + h + ":00</option>");
    $("sel-hour").innerHTML = hours.join("");
    $("sel-hour").value = "12";
    $("sel-season").onchange = $("sel-hour").onchange = renderConditions;
    $("cond-source").innerHTML = "Source: " + esc(meda.meta.source) + ", " + meda.meta.sols_used + " sols (" +
      meda.meta.sol_range[0] + "–" + meda.meta.sol_range[1] + "). Median of the sampled sols; range = 10th–90th percentile. " +
      '<a href="https://doi.org/' + esc(meda.meta.source_doi) + '" target="_blank" rel="noopener">doi:' + esc(meda.meta.source_doi) + "</a>";
    $("cond-body").hidden = false;
    $("cond-loading").hidden = true;
    renderConditions();
  }

  function fmt(v, d) { return v.toFixed(d); }

  function renderConditions() {
    var bin = meda.ls_bins[+$("sel-season").value];
    var hour = +$("sel-hour").value;
    $("cond-factors").innerHTML = VARS.map(function (v) {
      var cell = bin.hourly[v.key] ? bin.hourly[v.key][hour] : null;
      var value = cell
        ? "<b>" + fmt(cell.median, v.digits) + " " + v.unit + "</b><small>" + fmt(cell.p10, v.digits) + " to " + fmt(cell.p90, v.digits) + "</small>"
        : '<b class="nodata">no data</b><small></small>';
      return "<li>" + esc(v.label) + value + "</li>";
    }).join("");
  }

  function conditionsUnavailable(msg) {
    $("cond-loading").textContent = msg;
  }

  // ── Stop briefing card ───────────────────────────────────────────────
  function showStop(stop, evaInfo) {
    MW.highlightStop(stop ? stop.id : null);
    var card = $("briefing-card");
    if (!stop) { card.hidden = true; return; }
    $("brief-id").textContent = stop.id;
    $("brief-name").textContent = stop.name;
    $("brief-meta").textContent = [stop.mineral, stop.instrument ? "observed by " + stop.instrument : ""].filter(Boolean).join(" · ");
    $("brief-text").textContent = stop.briefing;
    $("brief-task").textContent = stop.task || "";
    $("brief-task-row").hidden = !stop.task;
    var link = $("brief-link");
    link.hidden = !stop.source_url;
    if (stop.source_url) link.href = stop.source_url;
    $("brief-eva").textContent = evaInfo || "";
    card.hidden = false;
  }

  // ── Guided EVA mode ──────────────────────────────────────────────────
  var eva = { active: false, step: 0, steps: [], anim: null };

  function buildSteps(route) {
    var steps = [{ kind: "start", idx: 0, label: "Leave the habitat" }];
    MW.getStops()
      .map(function (s) { return { kind: "stop", stop: s, idx: route.stopIndex[s.id] }; })
      .sort(function (a, b) { return a.idx - b.idx; })
      .forEach(function (s) { steps.push(s); });
    steps.push({ kind: "end", idx: route.coords.length - 1, label: "Back at the habitat" });
    return steps;
  }

  function elapsedAt(route, stepIndex) {
    var s = eva.steps[stepIndex];
    var km = route.cumKm[s.idx];
    var stopsDone = eva.steps.slice(1, stepIndex).filter(function (x) { return x.kind === "stop"; }).length;
    return { km: km, h: km / P.vel_kmh.value + stopsDone * MW.stopMin / 60 };
  }

  function animateTo(route, fromIdx, toIdx, done) {
    cancelAnimationFrame(eva.anim);
    var pts = route.coords.slice(Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx) + 1);
    if (fromIdx > toIdx) pts.reverse();
    if (pts.length < 2) {
      MW.setWalker(pts[0]);
      MW.profile.setCursor(route.cumKm[toIdx]);
      if (done) done();
      return;
    }
    var cum = MW.cumulativeKm(pts), total = cum[cum.length - 1];
    var dur = Math.min(2500, 600 + total * 600), t0 = performance.now();
    function frame(now) {
      var f = Math.min(1, (now - t0) / dur), target = f * total, i = 1;
      while (i < cum.length - 1 && cum[i] < target) i++;
      var segF = cum[i] === cum[i - 1] ? 1 : (target - cum[i - 1]) / (cum[i] - cum[i - 1]);
      var a = pts[i - 1], b = pts[i] || a;
      MW.setWalker([a[0] + (b[0] - a[0]) * segF, a[1] + (b[1] - a[1]) * segF]);
      MW.profile.setCursor(route.cumKm[Math.min(fromIdx, toIdx)] + (fromIdx > toIdx ? total - target : target));
      if (f < 1) eva.anim = requestAnimationFrame(frame); else if (done) done();
    }
    eva.anim = requestAnimationFrame(frame);
  }

  function goToStep(n) {
    var route = MW.getRoute();
    var prevIdx = eva.steps[eva.step] ? eva.steps[eva.step].idx : 0;
    eva.step = Math.max(0, Math.min(eva.steps.length - 1, n));
    var s = eva.steps[eva.step];
    var t = elapsedAt(route, eva.step);
    var info = "Step " + (eva.step + 1) + " of " + eva.steps.length + " · " + t.km.toFixed(2) + " km walked · T+" + ui.fmtHours(t.h);

    $("eva-step").textContent = s.kind === "stop" ? "Stop " + s.stop.id + ": " + s.stop.name : s.label;
    $("eva-progress").textContent = info;
    $("btn-eva-prev").disabled = eva.step === 0;
    $("btn-eva-next").disabled = eva.step === eva.steps.length - 1;

    MW.map.flyTo(route.coords[s.idx], s.kind === "stop" ? 14 : 13, { duration: 1.2 });
    animateTo(route, prevIdx, s.idx);
    showStop(s.kind === "stop" ? s.stop : null, info);
  }

  function startEva() {
    var route = MW.getRoute();
    if (!route) return;
    eva.active = true;
    eva.steps = buildSteps(route);
    eva.step = 0;
    document.body.classList.add("eva-on");
    $("eva-controls").hidden = false;
    $("btn-eva-start").hidden = true;
    MW.setWalker(route.coords[0]);
    goToStep(0);
  }

  function endEva() {
    cancelAnimationFrame(eva.anim);
    eva.active = false;
    document.body.classList.remove("eva-on");
    $("eva-controls").hidden = true;
    $("btn-eva-start").hidden = false;
    MW.removeWalker();
    MW.profile.setCursor(-1);
    showStop(null);
    MW.fitRoute();
  }

  // ── Data sources modal ───────────────────────────────────────────────
  function renderSources() {
    $("sources-list").innerHTML = CFG.SOURCES.map(function (s) {
      return "<tr><td>" + esc(s.what) + "</td><td>" + esc(s.mission) + "</td><td>" + esc(s.instrument) +
        '</td><td><a href="' + esc(s.url) + '" target="_blank" rel="noopener">link</a></td></tr>';
    }).join("");
  }

  // ── Wiring ───────────────────────────────────────────────────────────
  document.addEventListener("mw:route", function (e) {
    renderSummary(e.detail);
    $("btn-eva-start").disabled = false;
    if (eva.active) endEva();
  });

  $("btn-eva-start").onclick = startEva;
  $("btn-eva-next").onclick = function () { goToStep(eva.step + 1); };
  $("btn-eva-prev").onclick = function () { goToStep(eva.step - 1); };
  $("btn-eva-end").onclick = endEva;
  $("brief-close").onclick = function () { showStop(null); };
  $("btn-sources").onclick = function () { ui.openModal("sources-modal"); };

  renderParams();
  renderSources();

  MW.briefing = {
    showStop: showStop,
    setupConditions: setupConditions,
    conditionsUnavailable: conditionsUnavailable,
    setRadiation: setRadiation,
  };
})();
