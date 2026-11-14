// route.js - MarsWalk: ruta A* sobre la grilla real de Jezero.
//
// Entra:  origen y destino en { lon, lat } (grados, longitud Este positiva).
// Sale:   puntos de la ruta (lon, lat, altura), distancia, tiempo, alerta de retorno
//         a pie y datos para el perfil de elevacion.
//
// Datos que lee (los hace Datos y GIS):
//   data/cost_grid.json  -> meta, slope_deg, roughness, cost  (cost = -1 es celda bloqueada)
//   data/heights.json    -> heights_m (misma forma que la grilla)
// Las listas son planas por filas: valor(fila, col) = lista[fila * cols + col].
// La fila 0 es el NORTE y la columna 0 es el OESTE.

// ---------- Cola de prioridad (siempre saca la celda mas prometedora) ----------
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

// opciones: walkBackKm (10), speedKmh (3.3). Valores y fuentes: README del repo.
function createPlanner(costGrid, heightsGrid, options = {}) {
  const m = costGrid.meta;
  const cols = m.cols, rows = m.rows;
  const b = m.bounds_deg;
  const cellLon = m.cell_size_deg.lon, cellLat = m.cell_size_deg.lat;
  const ewKm = m.cell_size_m.east_west / 1000;   // ancho real de una celda (km)
  const nsKm = m.cell_size_m.north_south / 1000; // alto real de una celda (km)
  const cost = costGrid.cost;
  const slope = costGrid.slope_deg;
  const heights = heightsGrid ? heightsGrid.heights_m : null;
  const walkBackKm = options.walkBackKm !== undefined ? options.walkBackKm : 10;
  const speedKmh = options.speedKmh !== undefined ? options.speedKmh : 3.3;

  const idx = (x, y) => y * cols + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows;
  const blocked = (x, y) => cost[idx(x, y)] < 0;

  // lon/lat -> celda (o null si cae fuera de la zona)
  function toCell(lon, lat) {
    const x = Math.floor((lon - b.west) / cellLon);
    const y = Math.floor((b.north - lat) / cellLat);
    return inside(x, y) ? { x, y } : null;
  }
  // celda -> lon/lat del centro de la celda
  function toLonLat(x, y) {
    return { lon: b.west + (x + 0.5) * cellLon, lat: b.north - (y + 0.5) * cellLat };
  }
  // distancia real en km entre dos celdas (en linea recta)
  const distKm = (x1, y1, x2, y2) => Math.hypot((x1 - x2) * ewKm, (y1 - y2) * nsKm);

  // Si el clic cae en una celda bloqueada, busca la celda libre mas cercana
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

  // A*: busca la ruta de menor costo. Devuelve lista de celdas o null.
  // Costo de un paso = distancia real (km) * promedio del costo de las dos celdas.
  // (costo = 1 + w_p*pendiente/s_max + w_r*rugosidad, ya calculado por Datos y GIS)
  function astar(start, goal) {
    const N = cols * rows;
    const g = new Float64Array(N).fill(Infinity);
    const from = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
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
        // en diagonal no se puede "cortar la esquina" de una celda bloqueada
        if (dx !== 0 && dy !== 0 && (blocked(cur.x + dx, cur.y) || blocked(cur.x, cur.y + dy))) continue;
        const ni = idx(nx, ny);
        if (closed[ni]) continue;
        const step = distKm(cur.x, cur.y, nx, ny) * (cost[ci] + cost[ni]) / 2;
        const t = g[ci] + step;
        if (t < g[ni]) {
          g[ni] = t;
          from[ni] = ci;
          // heuristica: linea recta en km (nunca sobreestima porque el costo minimo es 1)
          open.push({ x: nx, y: ny }, t + distKm(nx, ny, goal.x, goal.y));
        }
      }
    }
    return null;
  }

  // Funcion principal.
  // from, to: { lon, lat }.  habitat (opcional): { lon, lat }; si no se da, se usa el origen.
  function plan(from, to, habitat) {
    const a = toCell(from.lon, from.lat);
    const z = toCell(to.lon, to.lat);
    if (!a) return { ok: false, reason: 'start_outside_area' };
    if (!z) return { ok: false, reason: 'end_outside_area' };
    const A = nearestFree(a), Z = nearestFree(z);
    if (!A) return { ok: false, reason: 'start_blocked' };
    if (!Z) return { ok: false, reason: 'end_blocked' };

    const cells = astar(A.cell, Z.cell);
    if (!cells) return { ok: false, reason: 'no_route' };

    // puntos y datos de la ruta
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

    // alerta de retorno a pie
    const hCell = habitat ? toCell(habitat.lon, habitat.lat) : A.cell;
    let maxFromHabitat = null, exceeds = null;
    if (hCell) {
      maxFromHabitat = Math.max(...cells.map(c => distKm(c.x, c.y, hCell.x, hCell.y)));
      exceeds = maxFromHabitat > walkBackKm;
    }

    return {
      ok: true,
      path,                               // [{ lon, lat, height_m }] para dibujar en el mapa
      distance_km: distance,
      time_h: distance / speedKmh,        // distancia / velocidad de marcha
      max_slope_deg: maxSlope,
      max_distance_from_habitat_km: maxFromHabitat,
      exceeds_walk_back: exceeds,         // true = mostrar alerta
      walk_back_km: walkBackKm,
      elevation_profile: profile,         // [{ km, height_m }] para el grafico (Chart.js)
      start_snapped: A.snapped,           // true si el clic cayo en celda bloqueada y se movio
      end_snapped: Z.snapped,
    };
  }

  return { plan, toCell, toLonLat, options: { walkBackKm, speedKmh } };
}

// Solo navegador: carga los JSON y devuelve el planificador listo
async function loadPlanner(base = '../data', options = {}) {
  const [c, h] = await Promise.all([
    fetch(base + '/cost_grid.json').then(r => r.json()),
    fetch(base + '/heights.json').then(r => r.json()),
  ]);
  return createPlanner(c, h, options);
}

if (typeof window !== 'undefined') window.MarsRoute = { createPlanner, loadPlanner };
if (typeof module !== 'undefined') module.exports = { createPlanner, loadPlanner };

// ---------- Prueba: node route.js  (desde la carpeta web/ del repo) ----------
if (typeof require !== 'undefined' && require.main === module) {
  const fs = require('fs'), path = require('path');
  const dir = path.join(__dirname, '..', 'data');
  const planner = createPlanner(
    JSON.parse(fs.readFileSync(path.join(dir, 'cost_grid.json'))),
    JSON.parse(fs.readFileSync(path.join(dir, 'heights.json')))
  );
  const A = { lon: 77.45, lat: 18.44 }, B = { lon: 77.38, lat: 18.47 };

  const r = planner.plan(A, B, A);
  console.log('1) Ruta normal:', r.ok ? 'OK' : r.reason);
  console.log('   puntos', r.path.length, '| km', r.distance_km.toFixed(2),
    '| min', (r.time_h * 60).toFixed(0), '| pendiente max', r.max_slope_deg,
    '| max desde habitat km', r.max_distance_from_habitat_km.toFixed(2),
    '| alerta', r.exceeds_walk_back);

  const small = createPlanner(
    JSON.parse(fs.readFileSync(path.join(dir, 'cost_grid.json'))),
    JSON.parse(fs.readFileSync(path.join(dir, 'heights.json'))), { walkBackKm: 1 });
  console.log('2) Con radio de 1 km, alerta:', small.plan(A, B, A).exceeds_walk_back);

  console.log('3) Fuera de la zona:', planner.plan({ lon: 0, lat: 0 }, B).reason);
}
