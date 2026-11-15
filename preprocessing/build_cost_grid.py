#!/usr/bin/env python3
"""Build the MarsWalk cost grid and height grid from the Jezero CTX DEM.

Pipeline:
    DEM (GeoTIFF, 20 m/px) -> optional crop -> slope (deg) -> roughness (0-1)
    -> block cells steeper than s_block -> downsample -> data/cost_grid.json
    + data/heights.json

Input DEM (not committed, see DATA_SOURCES.md):
    Mars 2020 Terrain Relative Navigation CTX DTM Mosaic, USGS Astrogeology,
    doi:10.5066/P906QQT8 (USGS usage terms: "Please cite authors").

Usage:
    python preprocessing/build_cost_grid.py
    python preprocessing/build_cost_grid.py --bbox 77.30 18.35 77.60 18.60 --preview
    python preprocessing/build_cost_grid.py --self-test
"""

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from ai_disclosure import AI_ASSISTANCE

REPO = Path(__file__).resolve().parent.parent
DEFAULT_DEM = (
    REPO
    / "data"
    / "raw"
    / "JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif"
)

# Route parameters (sources in README.md / DATA_SOURCES.md).
S_MAX_DEG = 20.0  # max walkable slope for a suited astronaut (NASA Artemis reference)
# Cells are blocked above S_BLOCK_DEG on the CTX slope, not S_MAX_DEG: the 20 m
# CTX DEM underestimates short steep scarps. Against an independent HiRISE 1 m
# DTM (preprocessing/validate_slope.py), blocking at 20 deg caught ~61 % of the
# cells steeper than 20 deg; blocking at 15 deg catches ~88 %.
S_BLOCK_DEG = 15.0
W_SLOPE = 1.0  # w_p: slope weight (team empirical tuning)
W_ROUGH = 1.0  # w_r: roughness weight (team empirical tuning)

ROUGH_WINDOW = 5  # pixels (5 x 20 m = 100 m window)
ROUGH_CLIP_PERCENTILE = 99.0  # roughness value mapped to 1.0


def compute_slope_deg(elev, dx_m, dy_m):
    """Slope in degrees from an elevation grid with ground pixel size dx_m, dy_m."""
    dz_dy, dz_dx = np.gradient(elev, dy_m, dx_m)
    return np.degrees(np.arctan(np.hypot(dz_dx, dz_dy)))


def window_mean(a, k):
    """Mean over a k x k moving window (edges use edge-replicated padding)."""
    pad = k // 2
    p = np.pad(a, pad, mode="edge")
    win = np.lib.stride_tricks.sliding_window_view(p, (k, k))
    return win.mean(axis=(-1, -2))


def compute_roughness_m(elev, k=ROUGH_WINDOW):
    """Roughness in meters: RMS deviation of elevation from the local best-fit
    trend, approximated as the local standard deviation of the elevation with
    the k x k moving average removed. Removing the moving average keeps a
    smooth incline from counting as "rough" (slope is penalized separately).
    """
    resid = elev - window_mean(elev, k)
    return np.sqrt(window_mean(resid * resid, k))


def block_reduce(a, f, func):
    """Reduce a 2D array by an integer factor f using func over each f x f block."""
    rows, cols = (a.shape[0] // f) * f, (a.shape[1] // f) * f
    blocks = a[:rows, :cols].reshape(rows // f, f, cols // f, f)
    return func(blocks, axis=(1, 3))


def build(elev, valid, dx_m, dy_m, factor):
    """Return downsampled (heights, slope, roughness_norm, cost, rough_scale)."""
    filled = np.where(valid, elev, np.nanmean(elev[valid]))
    slope = compute_slope_deg(filled, dx_m, dy_m)
    rough_m = compute_roughness_m(filled)

    rough_scale = float(np.percentile(rough_m[valid], ROUGH_CLIP_PERCENTILE))
    rough = np.clip(rough_m / rough_scale, 0.0, 1.0) if rough_scale > 0 else rough_m * 0

    # Downsample. Slope and roughness use the block MAXIMUM (conservative: a
    # coarse cell is as dangerous as its worst 20 m pixel); heights use the mean.
    h_ds = block_reduce(filled, factor, np.mean)
    s_ds = block_reduce(slope, factor, np.max)
    r_ds = block_reduce(rough, factor, np.max)
    v_ds = block_reduce(valid, factor, np.all)

    # Cost multiplier per cell: C = d * cost, cost = 1 + w_p*s/s_max + w_r*r.
    cost = 1.0 + W_SLOPE * s_ds / S_MAX_DEG + W_ROUGH * r_ds
    blocked = (s_ds > S_BLOCK_DEG) | ~v_ds
    cost = np.where(blocked, -1.0, cost)
    return h_ds, s_ds, r_ds, cost, rough_scale


def flat(a, decimals):
    """Row-major list rounded to `decimals` (ints when decimals == 0)."""
    r = np.round(a.astype(np.float64), decimals).ravel()
    return [int(v) for v in r] if decimals == 0 else [float(v) for v in r]


def self_test():
    """Check slope on a synthetic tilted plane and roughness on flat terrain."""
    n, px = 60, 20.0
    y, x = np.mgrid[0:n, 0:n] * px
    plane = x * math.tan(math.radians(10.0)) + y * 0.0
    s = compute_slope_deg(plane, px, px)
    assert np.allclose(s, 10.0, atol=1e-6), s
    r = compute_roughness_m(plane)
    assert r[10:-10, 10:-10].max() < 1e-6, r.max()
    steep = x * math.tan(math.radians(25.0))
    _, s_ds, _, cost, _ = build(steep + 0.0 * y, np.ones((n, n), bool), px, px, 3)
    assert np.allclose(s_ds, 25.0, atol=1e-6) and (cost == -1).all()
    # 17 deg is under s_max but over the s_block margin: must be blocked.
    mid = x * math.tan(math.radians(17.0))
    _, _, _, cost, _ = build(mid + 0.0 * y, np.ones((n, n), bool), px, px, 3)
    assert (cost == -1).all()
    print("self-test OK")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dem", type=Path, default=DEFAULT_DEM)
    ap.add_argument("--out-dir", type=Path, default=REPO / "data")
    ap.add_argument(
        "--bbox",
        type=float,
        nargs=4,
        metavar=("LON_W", "LAT_S", "LON_E", "LAT_N"),
        help="crop to this area (degrees, east-positive longitude)",
    )
    ap.add_argument("--target", type=int, default=500, help="approx. cells per side")
    ap.add_argument("--preview", action="store_true", help="also write a PNG preview")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        self_test()
        return

    import rasterio
    from rasterio.windows import from_bounds

    with rasterio.open(args.dem) as ds:
        if ds.dtypes[0] != "float32":
            sys.exit(
                f"Wrong file: dtype is {ds.dtypes[0]}, expected float32 elevation "
                "(a uint8 file is only a visualization image)."
            )
        radius = ds.crs.to_dict().get("a") or ds.crs.to_dict().get("R")
        if not radius or not (3.3e6 < radius < 3.5e6):
            sys.exit(f"Unexpected body radius in CRS: {radius} (expected Mars)")
        px_x, px_y = ds.res

        def to_xy(lon, lat):
            return math.radians(lon) * radius, math.radians(lat) * radius

        window = None
        if args.bbox:
            lon_w, lat_s, lon_e, lat_n = args.bbox
            (x0, y0), (x1, y1) = to_xy(lon_w, lat_s), to_xy(lon_e, lat_n)
            window = (
                from_bounds(x0, y0, x1, y1, ds.transform)
                .round_offsets()
                .round_lengths()
                .intersection(rasterio.windows.Window(0, 0, ds.width, ds.height))
            )
        band = ds.read(1, window=window, masked=True)
        transform = ds.window_transform(window) if window else ds.transform
        dem_name = Path(ds.name).name

    elev = np.asarray(band.filled(np.nan), dtype=np.float64)
    valid = ~np.ma.getmaskarray(band) & np.isfinite(elev)
    if not valid.any():
        sys.exit("No valid elevation data in the selected area.")

    factor = max(1, round(max(elev.shape) / args.target))

    # The DEM is equirectangular with standard parallel 0, so a pixel is px_x
    # meters wide only at the equator. At Jezero's latitude the true east-west
    # ground distance is px_x * cos(lat) (~5 % shorter at 18.4 N).
    lat_mid = math.degrees((transform.f - px_y * elev.shape[0] / 2) / radius)
    dx_ground = px_x * math.cos(math.radians(lat_mid))
    dy_ground = px_y

    heights, slope, rough, cost, rough_scale = build(
        elev, valid, dx_ground, dy_ground, factor
    )
    rows, cols = heights.shape

    west = math.degrees(transform.c / radius)
    north = math.degrees(transform.f / radius)
    east = math.degrees((transform.c + cols * factor * px_x) / radius)
    south = math.degrees((transform.f - rows * factor * px_y) / radius)

    meta = {
        "ai_assistance": AI_ASSISTANCE,
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_dem": dem_name,
        "source_doi": "10.5066/P906QQT8",
        "source_resolution_m": px_x,
        "body_radius_m": radius,
        "crs_note": "Equirectangular Mars 2000 Sphere, planetocentric latitude, "
        "east-positive longitude",
        "rows": rows,
        "cols": cols,
        "order": "row-major; row 0 is the northern edge, col 0 is the western edge",
        "bounds_deg": {"west": west, "south": south, "east": east, "north": north},
        "cell_size_deg": {
            "lon": (east - west) / cols,
            "lat": (north - south) / rows,
        },
        "cell_size_m": {
            "east_west": dx_ground * factor,
            "north_south": dy_ground * factor,
        },
    }

    cost_grid = {
        "meta": {
            **meta,
            "s_max_deg": S_MAX_DEG,
            "s_block_deg": S_BLOCK_DEG,
            "s_block_note": "cells are blocked when the CTX slope exceeds s_block_deg, "
            "a margin below the s_max_deg limit because the 20 m CTX DEM underestimates "
            "short steep scarps (validated against HiRISE 1 m, see slope_validation.json)",
            "w_slope": W_SLOPE,
            "w_rough": W_ROUGH,
            "cost_formula": "step cost = distance * cost; "
            "cost = 1 + w_slope * slope_deg / s_max_deg + w_rough * roughness; "
            "cost = -1 means blocked (slope_deg > s_block_deg or no data)",
            "slope_note": f"slope computed at {px_x:g} m/px, then block maximum "
            f"over {factor}x{factor} pixels",
            "roughness_note": f"RMS height residual in a {ROUGH_WINDOW}x{ROUGH_WINDOW} "
            f"px window, divided by {rough_scale:.3f} m "
            f"(p{ROUGH_CLIP_PERCENTILE:g}) and clipped to 0-1; block maximum",
        },
        "slope_deg": flat(slope, 1),
        "roughness": flat(rough, 2),
        "cost": flat(cost, 2),
    }
    heights_json = {
        "meta": {
            **meta,
            "units": "meters; per the USGS product metadata, elevation values refer to the Mars 2020 IAU sphere with a radius of 3396190 m",
            "height_note": f"block mean over {factor}x{factor} pixels",
            "min_m": float(heights.min()),
            "max_m": float(heights.max()),
        },
        "heights_m": flat(heights, 1),
    }

    args.out_dir.mkdir(parents=True, exist_ok=True)
    for name, obj in (("cost_grid.json", cost_grid), ("heights.json", heights_json)):
        path = args.out_dir / name
        path.write_text(json.dumps(obj, separators=(",", ":")))
        print(f"wrote {path}  ({path.stat().st_size / 1e6:.2f} MB)")

    blocked = cost < 0
    print(f"grid {rows} x {cols}, downsample factor {factor}")
    print(
        f"cell {meta['cell_size_m']['east_west']:.1f} m (E-W) x "
        f"{meta['cell_size_m']['north_south']:.1f} m (N-S)"
    )
    print(f"bounds lon {west:.4f}..{east:.4f} E, lat {south:.4f}..{north:.4f} N")
    print(f"heights {heights.min():.1f} .. {heights.max():.1f} m")
    print(f"slope median {np.median(slope):.1f} deg, max {slope.max():.1f} deg")
    print(f"blocked cells {blocked.mean() * 100:.1f} %")

    if args.preview:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        ext = [west, east, south, north]
        fig, axes = plt.subplots(1, 3, figsize=(18, 6), constrained_layout=True)
        panels = (
            (heights, "Elevation (m)", "terrain", None, None),
            (slope, "Slope (deg), red = blocked", "viridis", 0, S_BLOCK_DEG),
            (np.where(blocked, np.nan, cost), "Cost multiplier", "magma", None, None),
        )
        for ax, (data, title, cmap, vmin, vmax) in zip(axes, panels):
            im = ax.imshow(data, extent=ext, cmap=cmap, vmin=vmin, vmax=vmax)
            ax.imshow(
                np.where(blocked, 1.0, np.nan),
                extent=ext,
                cmap="autumn",
                vmin=0,
                vmax=2,
                alpha=0.9 if "Elevation" not in title else 0.0,
            )
            ax.set_title(title)
            ax.set_xlabel("Longitude (deg E)")
            ax.set_ylabel("Latitude (deg N)")
            ax.set_aspect(1 / math.cos(math.radians(lat_mid)))
            fig.colorbar(im, ax=ax, shrink=0.8)
        path = args.out_dir / "cost_grid_preview.png"
        fig.savefig(path, dpi=110)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
