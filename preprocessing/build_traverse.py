#!/usr/bin/env python3
"""Perseverance's real traverse: map layer and check against the cost grid.

Source: NASA Mars Trek feature service "Perseverance_Traverse_Path" (one
polyline per drive, with its sol). See DATA_SOURCES.md.

Outputs:
    data/perseverance_traverse.geojson   drives as GeoJSON lines (for the map)
    data/traverse_validation.json        how the cost grid classifies the cells
                                         the rover actually drove through
    data/traverse_preview.png            traverse over the blocked terrain, on the
                                         local CTX tiles (zoom 12)

Usage:
    python preprocessing/build_traverse.py
"""

import json
import math
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from ai_disclosure import AI_ASSISTANCE

REPO = Path(__file__).resolve().parent.parent
TRAVERSE = "https://trek.nasa.gov/mars/trekarcgis/rest/services/Perseverance_Traverse_Path/MapServer/0"
STEP_M = 10.0  # sample the drives every 10 m


def get_json(url):
    with urllib.request.urlopen(url, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    q = "/query?where=1%3D1&outFields=sol,length,fromRMC,toRMC&returnGeometry=true&outSR=4326&f=json"
    drives = get_json(TRAVERSE + q)["features"]
    drives.sort(key=lambda f: (f["attributes"]["sol"], f["attributes"]["fromRMC"]))

    grid = json.loads((REPO / "data" / "cost_grid.json").read_text())
    m = grid["meta"]
    rows, cols = m["rows"], m["cols"]
    b, cell, radius = m["bounds_deg"], m["cell_size_deg"], m["body_radius_m"]
    cost = np.array(grid["cost"], dtype=float).reshape(rows, cols)
    slope = np.array(grid["slope_deg"], dtype=float).reshape(rows, cols)
    rad = math.pi / 180

    # GeoJSON layer.
    features = []
    for f in drives:
        a = f["attributes"]
        for path in f["geometry"]["paths"]:
            features.append({
                "type": "Feature",
                "properties": {"sol": a["sol"], "length_m": a["length"],
                               "from_rmc": a["fromRMC"], "to_rmc": a["toRMC"]},
                "geometry": {"type": "LineString",
                             "coordinates": [[round(x, 6), round(y, 6)] for x, y in path]},
            })
    geo = {
        "type": "FeatureCollection",
        "metadata": {
            "ai_assistance": AI_ASSISTANCE,
            "source": "NASA Mars Trek feature service Perseverance_Traverse_Path",
            "source_url": TRAVERSE,
            "accessed_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "coordinates": "longitude, latitude in degrees (east-positive), as served by Mars Trek",
            "drives": len(drives),
            "sol_range": [drives[0]["attributes"]["sol"], drives[-1]["attributes"]["sol"]],
        },
        "features": features,
    }
    (REPO / "data" / "perseverance_traverse.geojson").write_text(json.dumps(geo, separators=(",", ":")))

    # Sample every drive every STEP_M meters and look up the cost grid cell.
    samples = []  # (row, col) of each sample inside the grid
    total_m = outside_m = 0.0
    for f in drives:
        for path in f["geometry"]["paths"]:
            for (x0, y0), (x1, y1) in zip(path[:-1], path[1:]):
                dx = (x1 - x0) * rad * math.cos(((y0 + y1) / 2) * rad) * radius
                dy = (y1 - y0) * rad * radius
                seg = math.hypot(dx, dy)
                n = max(1, int(seg // STEP_M))
                for k in range(n):
                    t = (k + 0.5) / n
                    lon, lat = x0 + t * (x1 - x0), y0 + t * (y1 - y0)
                    c = math.floor((lon - b["west"]) / cell["lon"])
                    r = math.floor((b["north"] - lat) / cell["lat"])
                    total_m += seg / n
                    if 0 <= r < rows and 0 <= c < cols:
                        samples.append((r, c))
                    else:
                        outside_m += seg / n
    rr = np.array([s[0] for s in samples])
    cc = np.array([s[1] for s in samples])
    blocked = cost[rr, cc] < 0
    s = slope[rr, cc]
    cells = set(samples)
    blocked_cells = {p for p in cells if cost[p] < 0}

    result = {
        "ai_assistance": AI_ASSISTANCE,
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "description": "Cells of the MarsWalk cost grid that Perseverance actually drove "
        "through (NASA traverse data), sampled every 10 m along the drives.",
        "important": "A rover is not a walking astronaut: this checks how often the grid "
        "blocks terrain that NASA's rover crossed, not whether that terrain is safe to walk.",
        "source_url": TRAVERSE,
        "drives": len(drives),
        "sol_range": geo["metadata"]["sol_range"],
        "traverse_length_m": round(total_m),
        "length_outside_grid_m": round(outside_m),
        "s_block_deg": m["s_block_deg"],
        "share_of_traverse_length_on_blocked_cells_pct": round(float(blocked.mean() * 100), 2),
        "share_of_traverse_length_on_walkable_cells_pct": round(float((~blocked).mean() * 100), 2),
        "distinct_cells_crossed": len(cells),
        "distinct_cells_blocked": len(blocked_cells),
        "grid_slope_along_traverse_deg": {
            "median": round(float(np.median(s)), 1),
            "p90": round(float(np.percentile(s, 90)), 1),
            "max": round(float(s.max()), 1),
        },
        "slope_note": "slope_deg of each ~60 m cell is the steepest 20 m pixel inside it",
    }
    (REPO / "data" / "traverse_validation.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    preview(geo)


def preview(geo):
    """Traverse (cyan) over the blocked-terrain overlay (red), on the CTX tiles."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.image as mpimg
    import matplotlib.pyplot as plt

    layer = "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0"
    tdir = REPO / "data" / "tiles" / layer
    idx = json.loads((tdir / "index.json").read_text())
    z = 12
    (r0, r1), (c0, c1) = idx["levels"][str(z)]["rows"], idx["levels"][str(z)]["cols"]
    img = np.ones(((r1 - r0 + 1) * 256, (c1 - c0 + 1) * 256))
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            f = tdir / "1.0.0/default/default028mm" / str(z) / str(r) / f"{c}.png"
            if f.exists():
                t = mpimg.imread(f)
                img[(r - r0) * 256:(r - r0 + 1) * 256, (c - c0) * 256:(c - c0 + 1) * 256] = (
                    t[..., 0] if t.ndim == 3 else t)
    deg = 360 / (2 ** (z + 1))
    ext = [c0 * deg - 180, (c1 + 1) * deg - 180, 90 - (r1 + 1) * deg, 90 - r0 * deg]
    ob = json.loads((REPO / "data" / "overlays" / "overlays.json").read_text())["bounds_deg"]

    fig, ax = plt.subplots(figsize=(10, 8))
    ax.imshow(img, extent=ext, cmap="gray")
    ax.imshow(mpimg.imread(REPO / "data" / "overlays" / "blocked.png"),
              extent=[ob["west"], ob["east"], ob["south"], ob["north"]])
    for f in geo["features"]:
        xy = np.array(f["geometry"]["coordinates"])
        ax.plot(xy[:, 0], xy[:, 1], color="#00e5ff", lw=1.2)
    stops = json.loads((REPO / "data" / "stops.json").read_text())
    h = stops["habitat"]["latlng"]
    ax.plot(h[1], h[0], "s", color="yellow", ms=9)
    for st in stops["stops"]:
        ax.plot(st["latlng"][1], st["latlng"][0], "o", color="orange", ms=9)
        ax.text(st["latlng"][1] + 0.003, st["latlng"][0], st["id"], color="orange",
                fontsize=13, weight="bold")
    ax.set_xlim(77.28, 77.47)
    ax.set_ylim(18.42, 18.52)
    ax.set_aspect(1 / math.cos(math.radians(18.47)))
    ax.set_title("Perseverance traverse (cyan, NASA) over MarsWalk blocked terrain (red)")
    ax.set_xlabel("Longitude (deg E)")
    ax.set_ylabel("Latitude (deg N)")
    out = REPO / "data" / "traverse_preview.png"
    fig.savefig(out, dpi=90, bbox_inches="tight")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
