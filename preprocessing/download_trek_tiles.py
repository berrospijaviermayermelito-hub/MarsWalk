#!/usr/bin/env python3
"""Download a local backup of NASA Mars Trek WMTS tiles for a work area.

The tiles are saved with the same folder structure as the Mars Trek REST
WMTS service, so the web app can switch between the live service and the
local copy by changing only the base URL:

    live:   https://trek.nasa.gov/tiles/Mars/EQ/<layer>/1.0.0/default/default028mm/{z}/{row}/{col}.png
    backup: data/tiles/<layer>/1.0.0/default/default028mm/{z}/{row}/{col}.png

Mars Trek equirectangular ("EQ") tiles use a geographic tiling scheme:
256 x 256 px tiles, level 0 is 2 x 1 tiles covering the whole planet.

Usage:
    python preprocessing/download_trek_tiles.py
    python preprocessing/download_trek_tiles.py --max-zoom 12
    python preprocessing/download_trek_tiles.py --layer <name> --bbox W S E N
"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TREK = "https://trek.nasa.gov/tiles/Mars/EQ"
TILE_SET = "1.0.0/default/default028mm"

# MRO CTX, Jezero Mosaic, Controlled (Mars Trek). Same CTX mosaic family as
# the DEM used for the cost grid.
DEFAULT_LAYER = "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0"
# West, south, east, north in degrees (east-positive). Same area as the DEM.
DEFAULT_BBOX = (77.1604655, 18.2110274, 77.6991776, 18.7211945)


def get(url, retries=4):
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return 404, b""
            if attempt == retries - 1:
                raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == retries - 1:
                raise
        time.sleep(2**attempt)
    return None, b""


def tile_matrices(layer):
    """Read MatrixWidth/Height per zoom level from the layer's capabilities."""
    _, xml = get(f"{TREK}/{layer}/1.0.0/WMTSCapabilities.xml")
    xml = xml.decode("utf-8", "replace")
    tms = re.search(
        r"<TileMatrixSet>\s*<ows:Title>.*?<ows:Identifier>default028mm</ows:Identifier>(.*?)</TileMatrixSet>",
        xml,
        re.S,
    )
    if not tms:
        sys.exit("default028mm tile matrix set not found in the capabilities")
    out = {}
    for m in re.finditer(r"<TileMatrix>(.*?)</TileMatrix>", tms.group(1), re.S):
        t = m.group(1)
        z = int(re.search(r"<ows:Identifier>(.*?)</ows:Identifier>", t).group(1))
        w = int(float(re.search(r"<MatrixWidth>(.*?)</MatrixWidth>", t).group(1)))
        h = int(float(re.search(r"<MatrixHeight>(.*?)</MatrixHeight>", t).group(1)))
        out[z] = (w, h)
    return out


def tile_range(bbox, width):
    """Rows and columns of the tiles that cover bbox at a level `width` tiles wide."""
    west, south, east, north = bbox
    deg = 360.0 / width
    return (
        int((90 - north) // deg),
        int((90 - south) // deg),
        int((west + 180) // deg),
        int((east + 180) // deg),
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--layer", default=DEFAULT_LAYER)
    ap.add_argument("--bbox", type=float, nargs=4, default=DEFAULT_BBOX,
                    metavar=("LON_W", "LAT_S", "LON_E", "LAT_N"))
    ap.add_argument("--max-zoom", type=int, default=13)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--out-dir", type=Path, default=REPO / "data" / "tiles")
    args = ap.parse_args()

    matrices = tile_matrices(args.layer)
    jobs, levels = [], {}
    for z in sorted(matrices):
        if z > args.max_zoom:
            continue
        r0, r1, c0, c1 = tile_range(args.bbox, matrices[z][0])
        levels[z] = {"rows": [r0, r1], "cols": [c0, c1]}
        jobs += [(z, r, c) for r in range(r0, r1 + 1) for c in range(c0, c1 + 1)]
    print(f"{args.layer}: {len(jobs)} tiles, levels 0..{max(levels)}")

    root = args.out_dir / args.layer / TILE_SET

    def fetch(job):
        z, r, c = job
        path = root / str(z) / str(r) / f"{c}.png"
        if path.exists():
            return "cached", path.stat().st_size
        status, body = get(f"{TREK}/{args.layer}/{TILE_SET}/{z}/{r}/{c}.png")
        if status != 200 or not body.startswith(b"\x89PNG"):
            return "missing", 0
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
        return "ok", len(body)

    counts, total = {}, 0
    with ThreadPoolExecutor(args.workers) as pool:
        for i, (state, size) in enumerate(pool.map(fetch, jobs), 1):
            counts[state] = counts.get(state, 0) + 1
            total += size
            if i % 100 == 0:
                print(f"  {i}/{len(jobs)}")

    index = {
        "layer": args.layer,
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "NASA Mars Trek WMTS, https://trek.nasa.gov/mars/",
        "live_template": f"{TREK}/{args.layer}/{TILE_SET}/{{z}}/{{row}}/{{col}}.png",
        "local_template": f"data/tiles/{args.layer}/{TILE_SET}/{{z}}/{{row}}/{{col}}.png",
        "tiling_scheme": "geographic (equirectangular), 256 px tiles, "
        "level 0 = 2 x 1 tiles, row 0 at 90 N, col 0 at 180 W",
        "bbox_deg": dict(zip(("west", "south", "east", "north"), args.bbox)),
        "levels": levels,
        "tiles_saved": counts.get("ok", 0) + counts.get("cached", 0),
        "tiles_missing": counts.get("missing", 0),
    }
    (args.out_dir / args.layer / "index.json").write_text(json.dumps(index, indent=2) + "\n")
    print(f"done: {counts}, {total / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
