// ═══════════════════════════════════════════════════════════════════════
// MarsWalk – map.js
// Leaflet map skeleton for Jezero Crater EVA planner.
// No frameworks, no build step. Pure ES5-compatible JS.
// ═══════════════════════════════════════════════════════════════════════

// ── Tile endpoint (Mars Trek WMTS, equirectangular) ────────────────────
// Source: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars
// Template: https://trek.nasa.gov/tiles/Mars/EQ/{layer}/1.0.0/{style}/{TileMatrixSet}/{z}/{y}/{x}.png
// Layer: Mars_Viking_MDIM21_ClrMosaic_global_232m  (global color mosaic)
const MARS_TREK_TILE_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg";

// ── Configuration ──────────────────────────────────────────────────────
const CONFIG = {
  // Jezero crater center
  CENTER_LAT: 18.4386,   // °N
  CENTER_LNG: 77.4508,   // °E
  INITIAL_ZOOM: 7,

  // Safety radius – assumed value for demo
  // TODO: cite source for realistic walk-back limit
  walk_back_km: 10, // km – "assumed value for demo"

  // Mars radius for distance calculations (km)
  MARS_RADIUS_KM: 3389.5,
};

// ── UI references ──────────────────────────────────────────────────────
var dotTiles  = document.getElementById("dot-tiles");
var lblTiles  = document.getElementById("lbl-tiles");
var dotRoute  = document.getElementById("dot-route");
var lblRoute  = document.getElementById("lbl-route");
var errorBanner = document.getElementById("error-banner");

var valDistance = document.getElementById("val-distance");
var valTime    = document.getElementById("val-time");
var valStops   = document.getElementById("val-stops");

// ── Helpers ────────────────────────────────────────────────────────────
function showError(msg) {
  errorBanner.style.display = "block";
  errorBanner.textContent = msg;
}

function clearError() {
  errorBanner.style.display = "none";
  errorBanner.textContent = "";
}

/** Convert km to approximate degrees on Mars at a given latitude. */
function kmToDeg(km, lat) {
  var degLat = km / (2 * Math.PI * CONFIG.MARS_RADIUS_KM / 360);
  // Not used for circle radius (Leaflet handles meters), but useful later
  return degLat;
}

/** Convert km to meters (Leaflet circle uses meters). */
function kmToMeters(km) { return km * 1000; }

// ═══════════════════════════════════════════════════════════════════════
// MAP SETUP  – Equirectangular CRS (NEVER Web Mercator for Mars)
// ═══════════════════════════════════════════════════════════════════════
var map = L.map("map", {
  crs: L.CRS.EPSG4326,   // Equirectangular / Plate Carrée
  center: [CONFIG.CENTER_LAT, CONFIG.CENTER_LNG],
  zoom: CONFIG.INITIAL_ZOOM,
  minZoom: 1,
  maxZoom: 10,
  zoomControl: true,
  attributionControl: true,
});

// ── Base tiles ─────────────────────────────────────────────────────────
var tileLoadErrors = 0;
var tileLoadOk     = 0;

var baseTiles = L.tileLayer(MARS_TREK_TILE_URL, {
  attribution: "Tiles © NASA/JPL/USGS – Mars Trek",
  tms: true,          // Mars Trek uses TMS (y-axis inverted)
  maxZoom: 10,
  errorTileUrl: "",   // blank on missing tile
}).addTo(map);

baseTiles.on("tileload", function () {
  tileLoadOk++;
  if (tileLoadOk === 1) {
    dotTiles.className = "dot ok";
    lblTiles.textContent = "Base tiles loaded";
    clearError();
  }
});

baseTiles.on("tileerror", function (e) {
  tileLoadErrors++;
  dotTiles.className = "dot warn";
  lblTiles.textContent = "Tile errors: " + tileLoadErrors;
  if (tileLoadOk === 0) {
    showError("Unable to load Mars Trek tiles. Check your connection or try later.");
  }
});

// ── Overlay placeholders (empty layers for the layer selector) ─────────
var overlaySlope     = L.layerGroup();  // Placeholder – no real data yet
var overlayRoughness = L.layerGroup();  // Placeholder
var overlayMinerals  = L.layerGroup();  // Placeholder
var overlayIce       = L.layerGroup();  // Placeholder

var baseMaps = {
  "Mars Viking Mosaic": baseTiles,
};

var overlayMaps = {
  "Slope":     overlaySlope,
  "Roughness": overlayRoughness,
  "Minerals":  overlayMinerals,
  "Ice":       overlayIce,
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// ═══════════════════════════════════════════════════════════════════════
// MARKERS
// ═══════════════════════════════════════════════════════════════════════

// TODO: confirm with team – coordinates are approximate placeholders.

// Habitat – on the crater floor
var habitatLatLng = [18.4386, 77.4508]; // TODO: confirm with team
var habitatMarker = L.marker(habitatLatLng, {
  title: "Habitat (demo)",
}).addTo(map)
  .bindPopup("<b>🏠 Habitat</b><br>Fictional base on Jezero crater floor");

// Science stops – along the delta front
var scienceStops = [
  // TODO: confirm with team
  { name: "Delta outcrop A – Carbonates", latlng: [18.48, 77.41] },
  { name: "Delta outcrop B – Clay minerals", latlng: [18.50, 77.44] },
  { name: "Delta outcrop C – Layered deposits", latlng: [18.51, 77.47] },
];

var stopMarkers = [];
scienceStops.forEach(function (stop, i) {
  var m = L.circleMarker(stop.latlng, {
    radius: 8,
    color: "#4fa0ff",
    fillColor: "#4fa0ff",
    fillOpacity: 0.7,
    weight: 2,
  }).addTo(map)
    .bindPopup("<b>🔬 Stop " + (i + 1) + "</b><br>" + stop.name);
  stopMarkers.push(m);
});

valStops.textContent = scienceStops.length + " planned";

// ═══════════════════════════════════════════════════════════════════════
// SAFETY CIRCLE  – walk-back radius
// ═══════════════════════════════════════════════════════════════════════
var walkBackCircle = L.circle(habitatLatLng, {
  radius: kmToMeters(CONFIG.walk_back_km),
  color: "#ffb74d",
  weight: 1.5,
  dashArray: "6 4",
  fillColor: "#ffb74d",
  fillOpacity: 0.06,
  interactive: false,
}).addTo(map);

// ═══════════════════════════════════════════════════════════════════════
// ROUTE DRAWING
// ═══════════════════════════════════════════════════════════════════════

var currentRoute = null; // L.polyline reference

/**
 * Draw a polyline route on the map.
 * @param {Array<[number, number]>} coords – array of [lat, lng] pairs
 * @param {Object}  [opts]  – optional Leaflet polyline options
 * @returns {L.Polyline} the drawn polyline
 *
 * In production this will be called by route.js with A* output.
 * For now it uses a hardcoded demo path.
 */
function drawRoute(coords, opts) {
  // Remove previous route if any
  if (currentRoute) {
    map.removeLayer(currentRoute);
  }

  var defaults = {
    color: "#3ddc84",
    weight: 3,
    opacity: 0.9,
    lineJoin: "round",
  };

  var options = Object.assign({}, defaults, opts || {});

  currentRoute = L.polyline(coords, options).addTo(map);

  // Update sidebar
  dotRoute.className = "dot ok";
  lblRoute.textContent = "Demo route loaded";

  // Rough distance calculation along the polyline (km on Mars)
  var totalKm = 0;
  for (var i = 1; i < coords.length; i++) {
    totalKm += haversine(coords[i - 1], coords[i]);
  }
  valDistance.textContent = totalKm.toFixed(2) + " km";
  // vel_kmh not yet defined by team; placeholder at 3 km/h
  // "assumed value for demo"
  var vel = 3; // km/h – assumed value for demo
  var hours = totalKm / vel;
  var mins  = Math.round(hours * 60);
  valTime.textContent = mins + " min (@ " + vel + " km/h)";

  return currentRoute;
}

/** Haversine distance on Mars (km). */
function haversine(a, b) {
  var R = CONFIG.MARS_RADIUS_KM;
  var dLat = (b[0] - a[0]) * Math.PI / 180;
  var dLon = (b[1] - a[1]) * Math.PI / 180;
  var lat1 = a[0] * Math.PI / 180;
  var lat2 = b[0] * Math.PI / 180;

  var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ── Demo route (hardcoded for the 30 s video) ─────────────────────────
// Path: Habitat → Stop A → Stop B → Stop C
// TODO: confirm with team – replace with A* output from route.js
var DEMO_ROUTE = [
  habitatLatLng,
  [18.44, 77.45],
  [18.45, 77.43],
  scienceStops[0].latlng,
  [18.49, 77.42],
  scienceStops[1].latlng,
  [18.505, 77.455],
  scienceStops[2].latlng,
];

drawRoute(DEMO_ROUTE);

// Fit map to show the full route + circle
map.fitBounds(currentRoute.getBounds().pad(0.3));

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS (for route.js integration)
// ═══════════════════════════════════════════════════════════════════════
// route.js will call:  drawRoute(pathFromAStar);
// It will also need:   CONFIG, habitatLatLng, scienceStops
window.MarsWalk = {
  drawRoute:     drawRoute,
  CONFIG:        CONFIG,
  habitatLatLng: habitatLatLng,
  scienceStops:  scienceStops,
  map:           map,
};
