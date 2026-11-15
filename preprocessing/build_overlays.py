#!/usr/bin/env python3
"""Render the cost grid as transparent PNG overlays for the web map.

Outputs (same pixel grid as data/cost_grid.json, one pixel per cell):
    data/overlays/slope.png     slope colors, blocked cells in red
    data/overlays/blocked.png   only blocked cells (red), transparent elsewhere
    data/overlays/overlays.json bounds and legend for Leaflet / CesiumJS

The grid is regular in latitude and longitude, so the images can be placed
directly with Leaflet L.imageOverlay (CRS EPSG4326) or a CesiumJS
SingleTileImageryProvider using the bounds in overlays.json.

Usage:
    python preprocessing/build_overlays.py
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from ai_disclosure import AI_ASSISTANCE

REPO = Path(__file__).resolve().parent.parent

BLOCKED_RGBA = (229, 57, 53, 200)  # red, mostly opaque
SLOPE_ALPHA = 140  # 0-255


def main():
    grid = json.loads((REPO / "data" / "cost_grid.json").read_text())
    m = grid["meta"]
    rows, cols = m["rows"], m["cols"]
    slope = np.array(grid["slope_deg"], dtype=float).reshape(rows, cols)
    blocked = np.array(grid["cost"], dtype=float).reshape(rows, cols) < 0
    s_block = m["s_block_deg"]

    out = REPO / "data" / "overlays"
    out.mkdir(parents=True, exist_ok=True)

    # Slope: viridis from 0 to s_block, blocked cells red.
    rgba = (plt.get_cmap("viridis")(np.clip(slope / s_block, 0, 1)) * 255).astype(np.uint8)
    rgba[..., 3] = SLOPE_ALPHA
    rgba[blocked] = BLOCKED_RGBA
    plt.imsave(out / "slope.png", rgba)

    only_blocked = np.zeros((rows, cols, 4), dtype=np.uint8)
    only_blocked[blocked] = BLOCKED_RGBA
    plt.imsave(out / "blocked.png", only_blocked)

    b = m["bounds_deg"]
    info = {
        "ai_assistance": AI_ASSISTANCE,
        "source": "data/cost_grid.json (built by preprocessing/build_cost_grid.py)",
        "bounds_deg": b,
        "leaflet_bounds": [[b["south"], b["west"]], [b["north"], b["east"]]],
        "size_px": {"width": cols, "height": rows},
        "s_block_deg": s_block,
        "legend": {
            "slope.png": f"viridis color scale from 0 deg (dark purple) to {s_block:g} deg "
            "(yellow); red = blocked (too steep or no data)",
            "blocked.png": "red = blocked, transparent = walkable",
        },
        "rendering_note": "one pixel per ~60 m cell; use CSS image-rendering: pixelated "
        "to keep cell edges sharp when zoomed in",
    }
    (out / "overlays.json").write_text(json.dumps(info, indent=2) + "\n")
    for f in ("slope.png", "blocked.png"):
        print(f"wrote {out / f}  ({(out / f).stat().st_size / 1e3:.0f} kB)")


if __name__ == "__main__":
    main()
