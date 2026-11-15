// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – map.js
// Leaflet map for the Jezero crater EVA planner: Mars CRS, NASA layers,
// habitat, science stops, walk-back radius, route drawing and safety checks.
// ═══════════════════════════════════════════════════════════════════════

(function () {
  var CFG = window.MW_CONFIG;
  var R_KM = CFG.MARS_RADIUS_KM;

  // ── Mars CRS ─────────────────────────────────────────────────────────
  // Equirectangular (Plate Carrée) like Mars Trek "EQ" tiles, but with the
  // Mars radius so map.distance() and the scale bar measure Mars kilometers.
  // Never Web Mercator for Mars.
  var MarsCRS = L.extend({}, L.CRS.EPSG4326, { code: "IAU2000:49900", R: R_KM * 1000 });

  // ── Geometry helpers (sphere with Mars radius) ───────────────────────
  var toRad = Math.PI / 180;

  function distanceKm(a, b) {
    var dLat = (b[0] - a[0]) * toRad;
    var dLon = (b[1] - a[1]) * toRad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a[0] * toRad) * Math.cos(b[0] * toRad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R_KM * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  /** Point at `km` from `center` along `bearingDeg`, on Mars. */
  function destination(center, km, bearingDeg) {
    var d = km / R_KM, brg = bearingDeg * toRad;
    var lat1 = center[0] * toRad, lon1 = center[1] * toRad;
    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg));
    var lon2 = lon1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1),
                                 Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    return [lat2 / toRad, lon2 / toRad];
  }

  /**
   * Circle with a true Mars radius. L.circle() is not used because Leaflet
   * converts meters to degrees with the Earth radius internally.
   */
  function marsCircle(center, km, options) {
    var pts = [];
    for (var b = 0; b < 360; b += 3) pts.push(destination(center, km, b));
    return L.polygon(pts, options);
  }

  /** Cumulative distance (km) at each vertex of a polyline. */
  function cumulativeKm(coords) {
    var out = [0];
    for (var i = 1; i < coords.length; i++) out.push(out[i - 1] + distanceKm(coords[i - 1], coords[i]));
    return out;
  }

  // ── Tile layer with local fallback ───────────────────────────────────
  // If a Mars Trek tile fails, try the copy in web/tiles/ once before giving up.
  var FallbackTileLayer = L.TileLayer.extend({
    createTile: function (coords, done) {
      var tile = L.TileLayer.prototype.createTile.call(this, coords, done);
      tile._mwCoords = { x: coords.x, y: coords.y, z: this._getZoomForUrl() };
      return tile;
    },
    _tileOnError: function (done, tile, e) {
      if (this.options.fallbackUrl && !tile._mwFallback) {
        tile._mwFallback = true;
        this.fire("tilefallback");
        tile.src = L.Util.template(this.options.fallbackUrl, tile._mwCoords);
        return;
      }
      L.TileLayer.prototype._tileOnError.call(this, done, tile, e);
    },
  });

  function trekLayer(def, extra) {
    var opts = L.extend({
      maxNativeZoom: def.maxNativeZoom,
      maxZoom: CFG.MAX_ZOOM,
      fallbackUrl: def.fallbackUrl,
      opacity: def.opacity === undefined ? 1 : def.opacity,
      attribution: "NASA/JPL/USGS – Mars Trek",
      // Mars Trek WMTS rows start at the top-left: do NOT set tms:true.
    }, extra || {});
    if (def.bounds) opts.bounds = L.latLngBounds(def.bounds);
    return new FallbackTileLayer(def.url, opts);
  }

  // ── Map ──────────────────────────────────────────────────────────────
  var map = L.map("map", {
    crs: MarsCRS,
    center: CFG.CENTER,
    zoom: CFG.INITIAL_ZOOM,
    minZoom: 3,
    maxZoom: CFG.MAX_ZOOM,
    zoomControl: true,
  });
  L.control.scale({ imperial: false, position: "bottomright" }).addTo(map);

  var B = CFG.BASE_LAYERS;
  var viking = trekLayer(B.viking);
  var ctx = trekLayer(B.ctx);
  var hirise = trekLayer(B.hirise);

  // Viking stays underneath as global context; high-res mosaics on top.
  var baseMaps = {};
  baseMaps[B.ctx.name] = L.layerGroup([trekLayer(B.viking), ctx]);
  baseMaps[B.hirise.name] = L.layerGroup([trekLayer(B.viking), trekLayer(B.ctx), hirise]);
  baseMaps[B.viking.name] = viking;
  baseMaps[B.ctx.name].addTo(map);

  var overlayMaps = {};
  Object.keys(CFG.OVERLAYS).forEach(function (k) {
    var def = CFG.OVERLAYS[k];
    overlayMaps[def.name] = trekLayer(def);
  });

  // ── Tile status (loading / ok / fallback / error) ────────────────────
  var tileState = { ok: 0, err: 0, fallback: false };
  function watchTiles(layer) {
    layer.on("tileload", function () {
      tileState.ok++;
      MW.ui.setStatus("tiles", tileState.fallback ? "warn" : "ok",
        tileState.fallback ? "Base map loaded (some tiles from local copy)" : "Base map loaded (Mars Trek)");
      MW.ui.clearError("tiles");
    });
    layer.on("tilefallback", function () { tileState.fallback = true; });
    layer.on("tileerror", function () {
      tileState.err++;
      if (tileState.ok === 0) {
        MW.ui.setStatus("tiles", "err", "Base map unavailable");
        MW.ui.showError("tiles", "Mars Trek tiles could not be loaded and no local copy exists for this area. Check your connection.");
      }
    });
  }
  watchTiles(ctx);
  watchTiles(hirise);
  watchTiles(viking);

  // ── Habitat, stops, walk-back radius ─────────────────────────────────
  var habitatIcon = L.divIcon({ className: "mw-habitat", html: "⌂", iconSize: [30, 30] });
  var stopsLayer = L.layerGroup();
  var safetyLayer = L.layerGroup();
  var habitat = null;
  var stops = [];
  var stopMarkers = {};

  function setHabitat(h) {
    habitat = h;
    L.marker(h.latlng, { icon: habitatIcon, title: h.name, zIndexOffset: 500 })
      .bindTooltip(h.name, { direction: "top", offset: [0, -14] })
      .addTo(map);
    drawWalkBack();
  }

  function drawWalkBack() {
    safetyLayer.clearLayers();
    var km = CFG.PARAMS.walk_back_km.value;
    marsCircle(habitat.latlng, km, {
      color: "#ffb74d", weight: 1.5, dashArray: "6 4",
      fillColor: "#ffb74d", fillOpacity: 0.05, interactive: false,
    }).addTo(safetyLayer);
    var labelPos = destination(habitat.latlng, km, 0);
    L.marker(labelPos, {
      interactive: false,
      icon: L.divIcon({ className: "mw-map-label", html: "Walk-back limit · " + km + " km", iconSize: [150, 18], iconAnchor: [75, 22] }),
    }).addTo(safetyLayer);
    safetyLayer.addTo(map);
  }

  function setStops(list, onClick) {
    stops = list;
    stopsLayer.clearLayers();
    list.forEach(function (s) {
      var m = L.marker(s.latlng, {
        title: s.name,
        icon: L.divIcon({ className: "mw-stop", html: s.id, iconSize: [26, 26] }),
        zIndexOffset: 400,
      })
        .bindTooltip(s.name + "<br><small>" + s.mineral + " · " + s.instrument + "</small>", { direction: "top", offset: [0, -12] })
        .on("click", function () { onClick(s); })
        .addTo(stopsLayer);
      stopMarkers[s.id] = m;
    });
    stopsLayer.addTo(map);
  }

  function highlightStop(id) {
    Object.keys(stopMarkers).forEach(function (k) {
      var el = stopMarkers[k].getElement();
      if (el) el.classList.toggle("active", k === id);
    });
  }

  // ── Blocked terrain from data/cost_grid.json (cost = -1 painted red) ──
  // Format (README "Data format"): rows, cols and bounds_deg live in `meta`;
  // arrays are flat, row-major, row 0 = north edge, col 0 = west edge.
  var blockedLayer = null;

  function setCostGrid(grid) {
    var m = grid.meta, b = m.bounds_deg;
    grid.rows = m.rows;
    grid.cols = m.cols;
    grid.bounds = [[b.south, b.west], [b.north, b.east]];

    var canvas = document.createElement("canvas");
    canvas.width = grid.cols;
    canvas.height = grid.rows;
    var g = canvas.getContext("2d");
    var img = g.createImageData(grid.cols, grid.rows);
    for (var k = 0; k < grid.cost.length; k++) {
      if (grid.cost[k] < 0) {
        var i = k * 4;
        img.data[i] = 239; img.data[i + 1] = 83; img.data[i + 2] = 80; img.data[i + 3] = 150;
      }
    }
    g.putImageData(img, 0, 0);
    blockedLayer = L.imageOverlay(canvas.toDataURL(), grid.bounds, { className: "mw-pixelated" });
    overlayMaps["Blocked terrain (CTX slope > " + m.s_block_deg + "°)"] = blockedLayer;
    blockedLayer.addTo(map);
  }

  /** Values of a cost_grid.json field sampled at each point (null outside the grid). */
  function sampleGrid(grid, field, coords) {
    if (!grid || !grid[field]) return null;
    var s = grid.bounds[0][0], w = grid.bounds[0][1], n = grid.bounds[1][0], e = grid.bounds[1][1];
    return coords.map(function (p) {
      var r = Math.floor((n - p[0]) / (n - s) * grid.rows);
      var c = Math.floor((p[1] - w) / (e - w) * grid.cols);
      if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) return null;
      return grid[field][r * grid.cols + c];
    });
  }

  /** Resample a polyline every `stepKm`, keeping original vertices. */
  function densify(coords, stepKm) {
    var out = [coords[0]];
    for (var i = 1; i < coords.length; i++) {
      var a = coords[i - 1], b = coords[i];
      var n = Math.max(1, Math.ceil(distanceKm(a, b) / stepKm));
      for (var k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  }

  // ── Route drawing + safety checks ────────────────────────────────────
  var routeLayer = L.layerGroup().addTo(map);
  var route = null;

  /**
   * Draw a route and compute its summary. Called with demo data or by route.js.
   * @param {Array<[number, number]>} coords  [lat, lng] pairs, habitat → … → habitat
   * @param {Object} [meta]  { label, elevations_m, distance_km, max_distance_from_habitat_km } (from route.js)
   */
  function drawRoute(coords, meta) {
    meta = meta || {};
    routeLayer.clearLayers();
    var cum = cumulativeKm(coords);
    // Prefer the planner's own figures (grid cell metrics) so the app and
    // docs/TEAM_RULES.md report the same numbers.
    var totalKm = meta.distance_km !== undefined ? meta.distance_km : cum[cum.length - 1];

    // Safety: any vertex outside the walk-back radius is flagged.
    var limitKm = CFG.PARAMS.walk_back_km.value;
    var maxFromHab = 0;
    if (meta.max_distance_from_habitat_km !== undefined) {
      maxFromHab = meta.max_distance_from_habitat_km;
    } else {
      coords.forEach(function (p) { maxFromHab = Math.max(maxFromHab, distanceKm(habitat.latlng, p)); });
    }
    var outside = maxFromHab > limitKm;

    // Safety: sample the grid every ~20 m; blocked cells (cost = -1) are flagged.
    var slopeChecked = false, blockedPts = [], maxSlope = null;
    if (MW.costGrid) {
      slopeChecked = true;
      var dense = densify(coords, 0.02);
      var costs = sampleGrid(MW.costGrid, "cost", dense);
      sampleGrid(MW.costGrid, "slope_deg", dense).forEach(function (v, i) {
        if (v === null) return;
        maxSlope = maxSlope === null ? v : Math.max(maxSlope, v);
        if (costs[i] < 0) blockedPts.push(dense[i]);
      });
    }
    var unsafe = outside || blockedPts.length > 0;

    L.polyline(coords, { color: "#000", weight: 7, opacity: 0.35 }).addTo(routeLayer);
    L.polyline(coords, { color: unsafe ? "#ef5350" : "#3ddc84", weight: 3.5, opacity: 0.95, lineJoin: "round" }).addTo(routeLayer);
    blockedPts.forEach(function (p) {
      L.circleMarker(p, { radius: 3, color: "#fff", weight: 1, fillColor: "#ef5350", fillOpacity: 1, interactive: false }).addTo(routeLayer);
    });

    // Index of the route vertex closest to each stop (for EVA steps / profile).
    var stopIndex = {};
    stops.forEach(function (s) {
      var best = 0, bestD = Infinity;
      coords.forEach(function (p, i) { var d = distanceKm(p, s.latlng); if (d < bestD) { bestD = d; best = i; } });
      stopIndex[s.id] = best;
    });

    var walkH = totalKm / CFG.PARAMS.vel_kmh.value;
    var evaH = walkH + stops.length * MW.stopMin / 60;

    route = {
      coords: coords,
      cumKm: cum,
      totalKm: totalKm,
      walkH: walkH,
      evaH: evaH,
      maxFromHabKm: maxFromHab,
      outsideWalkBack: outside,
      slopeChecked: slopeChecked,
      crossesBlocked: blockedPts.length > 0,
      maxSlopeDeg: maxSlope,
      overTime: evaH > CFG.PARAMS.eva_limit_h.value,
      stopIndex: stopIndex,
      elevations: meta.elevations_m || null,
      label: meta.label || "Route",
    };
    MW.ui.setStatus("route", "ok", route.label + " loaded");
    document.dispatchEvent(new CustomEvent("mw:route", { detail: route }));
    return route;
  }

  function fitRoute() {
    if (route) map.fitBounds(L.latLngBounds(route.coords).pad(0.25));
  }

  // ── Layer control & legend (added once all layers exist) ─────────────
  function finishControls() {
    overlayMaps["Science stops (NASA Mars Trek points)"] = stopsLayer;
    overlayMaps["Walk-back radius"] = safetyLayer;
    overlayMaps["EVA route"] = routeLayer;
    L.control.layers(baseMaps, overlayMaps, { collapsed: window.innerWidth < 900, position: "topright" }).addTo(map);

    var legend = L.control({ position: "bottomleft" });
    legend.onAdd = function () {
      var d = L.DomUtil.create("div", "mw-legend");
      d.innerHTML =
        '<div><i class="sw" style="background:#3ddc84"></i>Safe route</div>' +
        '<div><i class="sw" style="background:#ef5350"></i>Leaves walk-back radius / blocked slope</div>' +
        '<div><i class="sw dashed"></i>Walk-back radius</div>' +
        '<div><i class="sw dot">A</i>Science stop</div>';
      return d;
    };
    legend.addTo(map);
  }

  // ── EVA walker marker ────────────────────────────────────────────────
  var walker = null;
  function setWalker(latlng) {
    if (!walker) {
      walker = L.marker(latlng, {
        icon: L.divIcon({ className: "mw-walker", html: "", iconSize: [16, 16] }),
        zIndexOffset: 1000, interactive: false,
      }).addTo(map);
    } else {
      walker.setLatLng(latlng);
    }
  }
  function removeWalker() { if (walker) { map.removeLayer(walker); walker = null; } }

  // ── Public API ───────────────────────────────────────────────────────
  window.MW = window.MW || {};
  L.extend(window.MW, {
    map: map,
    distanceKm: distanceKm,
    cumulativeKm: cumulativeKm,
    setHabitat: setHabitat,
    setStops: setStops,
    highlightStop: highlightStop,
    setCostGrid: setCostGrid,
    densify: densify,
    drawRoute: drawRoute,
    fitRoute: fitRoute,
    finishControls: finishControls,
    setWalker: setWalker,
    removeWalker: removeWalker,
    getRoute: function () { return route; },
    getHabitat: function () { return habitat; },
    getStops: function () { return stops; },
  });
})();
