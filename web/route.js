// route.js - MarsWalk: A* route planner on the real Jezero cost grid.
//
// Input:  start and end as { lon, lat } (degrees, east-positive longitude).
// Output: route points (lon, lat, height), distance, walking time (one way and
//         round trip), walk-back alert and data for the elevation profile.
//
// Data it reads (built by the data team):
//   data/cost_grid.json -> meta, slope_deg, roughness, cost  (cost = -1 means blocked cell)
//   data/heights.json   -> heights_m (same shape as the grid)
// Arrays are flat, row-major: value(row, col) = array[row * cols + col].
// Row 0 is the NORTH edge and column 0 is the WEST edge.

// ---------- Priority queue (always pops the most promising cell) ----------
class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(item, priority) {
    this.items.push({ item, priority });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }
  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let s = i;
        if (l < this.items.length && this.items[l].priority < this.items[s].priority) s = l;
        if (r < this.items.length && this.items[r].priority < this.items[s].priority) s = r;
        if (s === i) break;
        [this.items[s], this.items[i]] = [this.items[i], this.items[s]];
        i = s;
      }
    }
    return top.item;
  }
}

// options: walkBackKm (default 10), speedKmh (default 3.3). Values and sources: repo README.
function createPlanner(costGrid, heightsGrid, options = {}) {
  const m = costGrid.meta;
  const cols = m.cols, rows = m.rows;
  const b = m.bounds_deg;
  const cellLon = m.cell_size_deg.lon, cellLat = m.cell_size_deg.lat;
  const ewKm = m.cell_size_m.east_west / 1000;   // real cell width (km)
  const nsKm = m.cell_size_m.north_south / 1000; // real cell height (km)
  const cost = costGrid.cost;
  const slope = costGrid.slope_deg;
  const heights = heightsGrid ? heightsGrid.heights_m : null;
  const walkBackKm = options.walkBackKm !== undefined ? options.walkBackKm : 10;
  const speedKmh = options.speedKmh !== undefined ? options.speedKmh : 3.3;

  const idx = (x, y) => y * cols + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;
  const blocked = (x, y) => cost[idx(x, y)] < 0;

  // lon/lat -> grid cell (or null if the point is outside the work area)
  function toCell(lon, lat) {
    const x = Math.floor((lon - b.west) / cellLon);
    const y = Math.floor((b.north - lat) / cellLat);
    return inside(x, y) ? { x, y } : null;
  }
  // grid cell -> lon/lat of the cell center
  function toLonLat(x, y) {
    return { lon: b.west + (x + 0.5) * cellLon, lat: b.north - (y + 0.5) * cellLat };
  }
  // real straight-line distance between two cells (km)
  const distKm = (x1, y1, x2, y2) => Math.hypot((x1 - x2) * ewKm, (y1 - y2) * nsKm);

  // If a click lands on a blocked cell, find the nearest free cell
  function nearestFree(c, maxR = 10) {
    if (!blocked(c.x, c.y)) return { cell: c, snapped: false };
    for (let r = 1; r <= maxR; r++) {
      let best = null, bestD = Infinity;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = c.x + dx, y = c.y + dy;
          if (!inside(x, y) || blocked(x, y)) continue;
          const d = distKm(c.x, c.y, x, y);
          if (d < bestD) { bestD = d; best = { x, y }; }
        }
      }
      if (best) return { cell: best, snapped: true };
    }
    return null;
  }

  // A*: finds the lowest-cost route. Returns a list of cells, or null if there is none.
  // Step cost = real distance (km) * average cost of the two cells.
  // (cell cost = 1 + w_p * slope / s_max + w_r * roughness, already computed by the data team)
  function astar(start, goal) {
    const N = cols * rows;
    const g = new Float64Array(N).fill(Infinity); // real cost from the start
    const from = new Int32Array(N).fill(-1);      // where we came from
    const closed = new Uint8Array(N);             // cells already expanded
    const open = new MinHeap();
    const si = idx(start.x, start.y);
    g[si] = 0;
    open.push({ x: start.x, y: start.y }, distKm(start.x, start.y, goal.x, goal.y));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

    while (open.size > 0) {
      const cur = open.pop();
      const ci = idx(cur.x, cur.y);
      if (closed[ci]) continue;
      closed[ci] = 1;
      if (cur.x === goal.x && cur.y === goal.y) {
        const path = [];
        for (let i = ci; i !== -1; i = from[i]) path.push({ x: i % cols, y: Math.floor(i / cols) });
        return path.reverse();
      }
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (!inside(nx, ny) || blocked(nx, ny)) continue;
        // diagonal moves cannot cut the corner of a blocked cell
        if (dx !== 0 && dy !== 0 && (blocked(cur.x + dx, cur.y) || blocked(cur.x, cur.y + dy))) continue;
        const ni = idx(nx, ny);
        if (closed[ni]) continue;
        const step = distKm(cur.x, cur.y, nx, ny) * (cost[ci] + cost[ni]) / 2;
        const t = g[ci] + step;
        if (t < g[ni]) {
          g[ni] = t;
          from[ni] = ci;
          // heuristic: straight-line distance in km (never overestimates: minimum cell cost is 1)
          open.push({ x: nx, y: ny }, t + distKm(nx, ny, goal.x, goal.y));
        }
      }
    }
    return null;
  }

  // Main function.
  // from, to: { lon, lat }.  habitat (optional): { lon, lat }; if omitted, the start is used.
  function plan(from, to, habitat) {
    const a = toCell(from.lon, from.lat);
    const z = toCell(to.lon, to.lat);
    if (!a) return { ok: false, reason: 'start_outside_area' };
    if (!z) return { ok: false, reason: 'end_outside_area' };
    // A habitat given outside the map is an error, not a silent null
    const hCell = habitat ? toCell(habitat.lon, habitat.lat) : null;
    if (habitat && !hCell) return { ok: false, reason: 'habitat_outside_area' };
    const A = nearestFree(a), Z = nearestFree(z);
    if (!A) return { ok: false, reason: 'start_blocked' };
    if (!Z) return { ok: false, reason: 'end_blocked' };

    const cells = astar(A.cell, Z.cell);
    if (!cells) return { ok: false, reason: 'no_route' };

    // route points and data
    let distance = 0, maxSlope = 0;
    const path = [], profile = [];
    cells.forEach((c, i) => {
      if (i > 0) distance += distKm(c.x, c.y, cells[i - 1].x, cells[i - 1].y);
      const ll = toLonLat(c.x, c.y);
      const h = heights ? heights[idx(c.x, c.y)] : null;
      maxSlope = Math.max(maxSlope, slope[idx(c.x, c.y)]);
      path.push({ lon: ll.lon, lat: ll.lat, height_m: h });
      profile.push({ km: distance, height_m: h });
    });

    // walk-back alert: STRAIGHT-LINE distance from the habitat (not walking distance,
    // which is longer when the way around obstacles is needed). Matches the 10 km circle.
    const hc = hCell || A.cell;
    const maxFromHabitat = Math.max(...cells.map(c => distKm(c.x, c.y, hc.x, hc.y)));

    return {
      ok: true,
      path,                                  // [{ lon, lat, height_m }] to draw on the map
      distance_km: distance,
      time_h: distance / speedKmh,           // ONE WAY: distance / walking speed
      round_trip_distance_km: distance * 2,  // assumes the way back follows the same route
      round_trip_time_h: (distance * 2) / speedKmh, // full EVA estimate: out and back
      max_slope_deg: maxSlope,
      max_distance_from_habitat_km: maxFromHabitat,
      exceeds_walk_back: maxFromHabitat > walkBackKm, // true = show the alert
      walk_back_km: walkBackKm,
      elevation_profile: profile,            // [{ km, height_m }] for the chart (Chart.js)
      start_snapped: A.snapped,              // true if the click was on a blocked cell and was moved
      end_snapped: Z.snapped,
    };
  }

  // Multi-stop route: points = [start, stop1, stop2, ...], each { lon, lat }.
  // Plans one leg per consecutive pair and joins them into a single route.
  // Used for the science-stops route (habitat -> A -> B -> C).
  function planVia(points, habitat) {
    if (!points || points.length < 2) return { ok: false, reason: 'need_at_least_two_points' };
    const legs = [];
    for (let i = 0; i < points.length - 1; i++) {
      const leg = plan(points[i], points[i + 1], habitat || points[0]);
      if (!leg.ok) return { ok: false, reason: leg.reason, failed_leg: i };
      legs.push(leg);
    }
    let distance = 0, maxSlope = 0, maxFromHabitat = 0;
    const path = [], profile = [];
    legs.forEach((leg, i) => {
      // the first point of every leg after the first repeats the previous end point
      const from = i === 0 ? 0 : 1;
      leg.path.slice(from).forEach(q => path.push(q));
      leg.elevation_profile.slice(from).forEach(e => profile.push({ km: distance + e.km, height_m: e.height_m }));
      distance += leg.distance_km;
      maxSlope = Math.max(maxSlope, leg.max_slope_deg);
      maxFromHabitat = Math.max(maxFromHabitat, leg.max_distance_from_habitat_km);
    });
    return {
      ok: true,
      path,
      legs: legs.map(l => ({ distance_km: l.distance_km, time_h: l.time_h })),
      stops_count: points.length - 1,
      distance_km: distance,
      time_h: distance / speedKmh,
      round_trip_distance_km: distance * 2,  // assumes the way back follows the same route
      round_trip_time_h: (distance * 2) / speedKmh,
      max_slope_deg: maxSlope,
      max_distance_from_habitat_km: maxFromHabitat,
      exceeds_walk_back: maxFromHabitat > walkBackKm,
      walk_back_km: walkBackKm,
      elevation_profile: profile,
    };
  }

  return { plan, planVia, toCell, toLonLat, options: { walkBackKm, speedKmh } };
}

// Browser only: loads the JSON files and returns a ready planner
async function loadPlanner(base = '../data', options = {}) {
  const [c, h] = await Promise.all([
    fetch(base + '/cost_grid.json').then(r => r.json()),
    fetch(base + '/heights.json').then(r => r.json()),
  ]);
  return createPlanner(c, h, options);
}

if (typeof window !== 'undefined') {
  window.MarsRoute = { createPlanner, loadPlanner };

  // Contract with the frontend (docs/FRONTEND.md, Frontend branch). Everything in [lat, lng], like Leaflet.
  //   await MarsWalkRoute.init('../data');                  // once, when the page loads
  //   const r = MarsWalkRoute.findPath([lat,lng], [lat,lng], habitatLatLng);
  //   if (!r.blocked) MarsWalk.drawRoute(r.path);
  let planner = null;
  window.MarsWalkRoute = {
    init: async function (base, options) { planner = await loadPlanner(base, options); return planner; },
    findPath: function (start, end, habitat) {
      if (!planner) throw new Error('Call MarsWalkRoute.init() first');
      const r = planner.plan(
        { lat: start[0], lon: start[1] },
        { lat: end[0], lon: end[1] },
        habitat ? { lat: habitat[0], lon: habitat[1] } : undefined
      );
      if (!r.ok) return { blocked: true, reason: r.reason, path: [] };
      return {
        blocked: false,
        path: r.path.map(function (q) { return [q.lat, q.lon]; }),
        distance_km: r.distance_km,
        time_h: r.time_h,
        round_trip_distance_km: r.round_trip_distance_km,
        round_trip_time_h: r.round_trip_time_h,
        elevations_m: r.elevation_profile.map(function (e) { return e.height_m; }),
        elevation_profile: r.elevation_profile,
        max_slope_deg: r.max_slope_deg,
        max_distance_from_habitat_km: r.max_distance_from_habitat_km,
        exceeds_walk_back: r.exceeds_walk_back,
        walk_back_km: r.walk_back_km,
        start_snapped: r.start_snapped,
        end_snapped: r.end_snapped,
      };
    },
    // Multi-stop route: latlngs = [[lat,lng], [lat,lng], ...] (habitat first, then the science stops)
    findPathVia: function (latlngs, habitat) {
      if (!planner) throw new Error('Call MarsWalkRoute.init() first');
      const r = planner.planVia(
        latlngs.map(function (q) { return { lat: q[0], lon: q[1] }; }),
        habitat ? { lat: habitat[0], lon: habitat[1] } : undefined
      );
      if (!r.ok) return { blocked: true, reason: r.reason, failed_leg: r.failed_leg, path: [] };
      return {
        blocked: false,
        path: r.path.map(function (q) { return [q.lat, q.lon]; }),
        legs: r.legs,
        stops_count: r.stops_count,
        distance_km: r.distance_km,
        time_h: r.time_h,
        round_trip_distance_km: r.round_trip_distance_km,
        round_trip_time_h: r.round_trip_time_h,
        elevations_m: r.elevation_profile.map(function (e) { return e.height_m; }),
        elevation_profile: r.elevation_profile,
        max_slope_deg: r.max_slope_deg,
        max_distance_from_habitat_km: r.max_distance_from_habitat_km,
        exceeds_walk_back: r.exceeds_walk_back,
        walk_back_km: r.walk_back_km,
      };
    },
  };
}
if (typeof module !== 'undefined') module.exports = { createPlanner, loadPlanner };

// ---------- Self-test: node route.js  (run from the web/ folder of the repo) ----------
if (typeof require !== 'undefined' && require.main === module) {
  const fs = require('fs'), path = require('path');
  const dir = path.join(__dirname, '..', 'data');
  const cost = JSON.parse(fs.readFileSync(path.join(dir, 'cost_grid.json')));
  const heights = JSON.parse(fs.readFileSync(path.join(dir, 'heights.json')));
  const planner = createPlanner(cost, heights);
  const A = { lon: 77.45, lat: 18.44 }, B = { lon: 77.38, lat: 18.47 };

  const r = planner.plan(A, B, A);
  console.log('1) Normal route:', r.ok ? 'OK' : r.reason);
  console.log('   points', r.path.length, '| km', r.distance_km.toFixed(2),
    '| one-way min', (r.time_h * 60).toFixed(0),
    '| round-trip min', (r.round_trip_time_h * 60).toFixed(0),
    '| max slope', r.max_slope_deg,
    '| max km from habitat', r.max_distance_from_habitat_km.toFixed(2),
    '| alert', r.exceeds_walk_back);

  const small = createPlanner(cost, heights, { walkBackKm: 1 });
  console.log('2) With a 1 km radius, alert:', small.plan(A, B, A).exceeds_walk_back);

  console.log('3) Start outside the area:', planner.plan({ lon: 0, lat: 0 }, B).reason);
  console.log('4) Habitat outside the area:', planner.plan(A, B, { lon: 0, lat: 0 }).reason);

  // 5) Multi-stop route: habitat -> stop A -> stop B -> stop C (demo points from web/map.js)
  const hab = { lon: 77.4508, lat: 18.4386 };
  const stops = [{ lon: 77.41, lat: 18.48 }, { lon: 77.44, lat: 18.50 }, { lon: 77.47, lat: 18.51 }];
  const v = planner.planVia([hab, ...stops], hab);
  const legSum = v.legs.reduce((acc, l) => acc + l.distance_km, 0);
  const profEnd = v.elevation_profile[v.elevation_profile.length - 1].km;
  console.log('5) Multi-stop route:', v.ok ? 'OK' : v.reason);
  console.log('   stops', v.stops_count, '| legs km', v.legs.map(l => l.distance_km.toFixed(2)).join(' + '),
    '| total km', v.distance_km.toFixed(2),
    '| round-trip min', (v.round_trip_time_h * 60).toFixed(0),
    '| alert', v.exceeds_walk_back);
  console.log('   total equals sum of legs:', Math.abs(legSum - v.distance_km) < 1e-9,
    '| profile ends at total km:', Math.abs(profEnd - v.distance_km) < 1e-9,
    '| points', v.path.length, '= profile points', v.elevation_profile.length);
  console.log('6) Fewer than two points:', planner.planVia([hab], hab).reason);
}
