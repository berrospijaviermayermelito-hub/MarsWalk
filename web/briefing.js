// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – briefing.js
// Sidebar panels: route summary + safety checks, conditions traffic light,
// stop briefing card, guided EVA mode and the data-sources modal.
// ═══════════════════════════════════════════════════════════════════════

(function () {
  var ui = MW.ui, $ = ui.$, esc = ui.esc;
  var CFG = window.MW_CONFIG, P = CFG.PARAMS;

  // ── Route summary & safety checks ────────────────────────────────────
  function renderSummary(route) {
    $("val-distance").textContent = route.totalKm.toFixed(2) + " km (round trip)";
    $("val-time").textContent = ui.fmtHours(route.evaH);
    $("val-time-detail").textContent =
      "Walking " + ui.fmtHours(route.walkH) + " @ " + P.vel_kmh.value + " km/h + " +
      MW.getStops().length + " × " + P.stop_min.value + " min at stops";
    $("val-stops").textContent = MW.getStops().length + " science stops";

    var pct = Math.min(100, route.evaH / P.eva_limit_h.value * 100);
    var bar = $("eva-bar");
    bar.style.width = pct + "%";
    bar.className = "bar-fill " + (route.overTime ? "red" : pct > 80 ? "amber" : "green");
    $("eva-bar-label").textContent = Math.round(pct) + "% of " + P.eva_limit_h.value + " h EVA limit";

    var checks = [
      {
        ok: !route.outsideWalkBack,
        text: route.outsideWalkBack
          ? "Route goes " + route.maxFromHabKm.toFixed(1) + " km from the habitat – beyond the " + P.walk_back_km.value + " km walk-back limit"
          : "Always within " + P.walk_back_km.value + " km walk-back radius (max " + route.maxFromHabKm.toFixed(1) + " km)",
      },
      {
        ok: !route.overTime,
        text: route.overTime ? "EVA exceeds the " + P.eva_limit_h.value + " h limit" : "EVA fits within the " + P.eva_limit_h.value + " h limit",
      },
      {
        ok: route.slopeChecked && !route.crossesBlocked,
        warn: !route.slopeChecked,
        text: !route.slopeChecked
          ? "Slope check pending (cost_grid.json not loaded)"
          : route.crossesBlocked
            ? "Route crosses terrain steeper than s_max = " + P.s_max_deg.value + "° (red dots)"
            : "No slope above s_max = " + P.s_max_deg.value + "° (max " + Math.round(route.maxSlopeDeg) + "°)",
      },
    ];
    $("safety-checks").innerHTML = checks.map(function (c) {
      var cls = c.warn ? "warn" : c.ok ? "ok" : "err";
      var icon = c.warn ? "!" : c.ok ? "✓" : "✕";
      return '<li class="' + cls + '"><span>' + icon + "</span>" + esc(c.text) + "</li>";
    }).join("");
  }

  function renderParams() {
    $("params").innerHTML = Object.keys(P).map(function (k) {
      var p = P[k];
      return "<li><span>" + esc(p.label) + "</span><b>" + p.value + " " + esc(p.unit) + "</b>" + ui.sourceTag(p.source) + "</li>";
    }).join("");
  }

  // ── Conditions traffic light ─────────────────────────────────────────
  var meda = null;

  function level(value, kind) {
    var t = CFG.CONDITIONS[kind];
    if (kind === "temp_c") return value >= t.green_min ? "green" : value >= t.amber_min ? "amber" : "red";
    return value <= t.green_max ? "green" : value <= t.amber_max ? "amber" : "red";
  }
  var RANK = { green: 0, amber: 1, red: 2 };
  var VERDICT = {
    green: "Good window for an EVA",
    amber: "EVA possible with precautions",
    red: "Not recommended – postpone the EVA",
  };

  function setupConditions(result) {
    meda = result.data;
    var seasons = Object.keys(meda.seasons);
    var hours = meda.hours || Object.keys(meda.seasons[seasons[0]]);
    $("sel-season").innerHTML = seasons.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("");
    $("sel-hour").innerHTML = hours.map(function (h) { return "<option>" + esc(h) + "</option>"; }).join("");
    $("sel-hour").value = hours[Math.floor(hours.length / 2)];
    $("sel-season").onchange = $("sel-hour").onchange = renderConditions;
    $("cond-source").textContent = "Source: " + (meda.source || "MEDA summary");
    $("cond-sample").hidden = !result.sample;
    $("cond-body").hidden = false;
    $("cond-loading").hidden = true;
    renderConditions();
  }

  function renderConditions() {
    var row = meda.seasons[$("sel-season").value][$("sel-hour").value];
    if (!row) return;
    var rad = CFG.CONDITIONS.radiation_msv_day;
    var factors = [
      { name: "Temperature", value: row.temp_c + " °C", lvl: level(row.temp_c, "temp_c"), src: "MEDA" },
      { name: "Dust (opacity τ)", value: row.dust_tau.toFixed(2), lvl: level(row.dust_tau, "dust_tau"), src: "MEDA" },
      { name: "Radiation", value: (rad.value / 24).toFixed(3) + " mSv/h", lvl: "green", src: "RAD (Gale)" },
    ];
    var worst = factors.reduce(function (w, f) { return RANK[f.lvl] > RANK[w] ? f.lvl : w; }, "green");

    document.querySelectorAll("#traffic-light .bulb").forEach(function (b) {
      b.classList.toggle("on", b.dataset.lvl === worst);
    });
    $("cond-verdict").textContent = VERDICT[worst];
    $("cond-verdict").className = "verdict " + worst;
    $("cond-factors").innerHTML = factors.map(function (f) {
      return '<li><i class="dot ' + ({ green: "ok", amber: "warn", red: "err" })[f.lvl] + '"></i>' +
        esc(f.name) + "<b>" + esc(f.value) + '</b><small>' + esc(f.src) + "</small></li>";
    }).join("");
  }

  // ── Stop briefing card ───────────────────────────────────────────────
  function showStop(stop, evaInfo) {
    MW.highlightStop(stop ? stop.id : null);
    var card = $("briefing-card");
    if (!stop) { card.hidden = true; return; }
    $("brief-id").textContent = stop.id;
    $("brief-name").textContent = stop.name;
    $("brief-meta").textContent = stop.mineral + " · detected by " + stop.instrument;
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
    return { km: km, h: km / P.vel_kmh.value + stopsDone * P.stop_min.value / 60 };
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

    var target = route.coords[s.idx];
    MW.map.flyTo(target, s.kind === "stop" ? 14 : 13, { duration: 1.2 });
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

  MW.briefing = { showStop: showStop, setupConditions: setupConditions };
})();
