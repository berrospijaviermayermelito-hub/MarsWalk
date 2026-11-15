#!/usr/bin/env python3
"""Download a local fallback copy of the Mars Trek CTX tiles for the demo area.

The app tries web/tiles/ctx/{z}/{y}/{x}.png whenever a Mars Trek tile fails,
so the demo still shows a base map if Mars Trek is slow or down.

Usage (from the repo root):  python3 web/tools/fetch_fallback_tiles.py
Only the Python standard library is used.
"""
import math
import pathlib
import time
import urllib.error
import urllib.request

LAYER = "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0"
URL = "https://trek.nasa.gov/tiles/Mars/EQ/" + LAYER + "/1.0.0/default/default028mm/{z}/{y}/{x}.png"
OUT = pathlib.Path(__file__).resolve().parent.parent / "tiles" / "ctx"

# (zoom range, bbox south, west, north, east)
AREAS = [
    (range(9, 12), (18.21, 77.16, 18.72, 77.70)),   # whole CTX mosaic, overview zooms
    (range(12, 13), (18.34, 77.28, 18.62, 77.62)),  # demo area, zoom 12
    (range(13, 14), (18.40, 77.36, 18.55, 77.52)),  # demo route, zoom 13
]


def tile_range(z, s, w, n, e):
    """Equirectangular WMTS grid: 2^(z+1) x 2^z tiles, origin top-left (-180, 90)."""
    span = 180.0 / 2 ** z
    rows = range(math.floor((90 - n) / span), math.floor((90 - s) / span) + 1)
    cols = range(math.floor((w + 180) / span), math.floor((e + 180) / span) + 1)
    return rows, cols


def main():
    ok = skipped = missing = 0
    for zooms, (s, w, n, e) in AREAS:
        for z in zooms:
            rows, cols = tile_range(z, s, w, n, e)
            for y in rows:
                for x in cols:
                    dest = OUT / str(z) / str(y) / f"{x}.png"
                    if dest.exists():
                        skipped += 1
                        continue
                    try:
                        req = urllib.request.Request(URL.format(z=z, y=y, x=x), headers={"User-Agent": "MarsWalk-tile-fetch"})
                        data = urllib.request.urlopen(req, timeout=30).read()
                    except urllib.error.HTTPError:
                        missing += 1  # outside mosaic coverage
                        continue
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(data)
                    ok += 1
                    time.sleep(0.05)
    print(f"downloaded {ok}, already present {skipped}, not available {missing} -> {OUT}")


if __name__ == "__main__":
    main()
