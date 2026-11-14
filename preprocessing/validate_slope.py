#!/usr/bin/env python3
"""Validate the CTX-derived slope against an independent HiRISE elevation model.

The cost grid uses slopes from the MRO CTX DEM (20 m/px). This script takes a
HiRISE DTM (1 m/px, built from different stereo images), averages it onto the
same 20 m grid, computes slope with the same function and compares the two.

Inputs (not committed, see DATA_SOURCES.md):
    CTX DTM mosaic, doi:10.5066/P906QQT8
    HiRISE DTM tile Jezero_C, doi:10.5066/P9REJ9JN

Usage:
    python preprocessing/validate_slope.py
"""

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject
from rasterio.windows import from_bounds

from build_cost_grid import DEFAULT_DEM, REPO, S_MAX_DEG, compute_slope_deg

DEFAULT_HIRISE = (
    REPO
    / "data"
    / "raw"
    / "DTM_MOLAtopography_DeltaGeoid_Jezero_C_Edited_affine_1m_Eqc_latTs0_lon0.tif"
)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--ctx", type=Path, default=DEFAULT_DEM)
    ap.add_argument("--hirise", type=Path, default=DEFAULT_HIRISE)
    ap.add_argument("--out", type=Path, default=REPO / "data" / "slope_validation.json")
    args = ap.parse_args()

    with rasterio.open(args.ctx) as ctx, rasterio.open(args.hirise) as hi:
        radius = ctx.crs.to_dict().get("a") or ctx.crs.to_dict().get("R")
        px = ctx.res[0]
        # CTX pixels that overlap the HiRISE tile.
        win = (
            from_bounds(*hi.bounds, ctx.transform)
            .round_offsets()
            .round_lengths()
            .intersection(rasterio.windows.Window(0, 0, ctx.width, ctx.height))
        )
        ctx_elev = ctx.read(1, window=win, masked=True)
        transform = ctx.window_transform(win)

        # Average the 1 m HiRISE heights onto the 20 m CTX grid.
        hi_elev = np.full(ctx_elev.shape, np.nan, dtype=np.float32)
        reproject(
            source=rasterio.band(hi, 1),
            destination=hi_elev,
            src_nodata=hi.nodata,
            dst_transform=transform,
            dst_crs=ctx.crs,
            dst_nodata=np.nan,
            resampling=Resampling.average,
        )

    lat_mid = math.degrees((transform.f - px * ctx_elev.shape[0] / 2) / radius)
    dx = px * math.cos(math.radians(lat_mid))
    ctx_filled = np.asarray(ctx_elev.filled(np.nan), dtype=np.float64)
    hi_filled = hi_elev.astype(np.float64)

    slope_ctx = compute_slope_deg(ctx_filled, dx, px)
    slope_hi = compute_slope_deg(hi_filled, dx, px)
    # NaN neighbors propagate through the gradient, so this keeps only cells
    # whose whole neighborhood is valid in both DEMs.
    ok = np.isfinite(slope_ctx) & np.isfinite(slope_hi)
    a, b = slope_ctx[ok], slope_hi[ok]
    d = a - b
    dz = (ctx_filled - hi_filled)[ok]

    blocked_ctx, blocked_hi = a > S_MAX_DEG, b > S_MAX_DEG

    # The cost grid keeps the steepest 20 m pixel of each 3x3 block (60 m
    # cells). Approximate that with a 3x3 moving maximum of the CTX slope and
    # check how many HiRISE-steep pixels end up inside a blocked neighborhood.
    padded = np.pad(np.nan_to_num(slope_ctx, nan=0.0), 1, mode="edge")
    ctx_max3 = np.lib.stride_tricks.sliding_window_view(padded, (3, 3)).max(axis=(-1, -2))
    blocked_ctx_60m = ctx_max3[ok] > S_MAX_DEG
    both = int((blocked_ctx & blocked_hi).sum())
    result = {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "description": "Slope from the CTX DEM (used by the cost grid) compared "
        "with slope from an independent HiRISE DTM averaged to the same 20 m grid.",
        "ctx_dem": args.ctx.name,
        "hirise_dtm": args.hirise.name,
        "grid_resolution_m": px,
        "cells_compared": int(ok.sum()),
        "area_km2": round(float(ok.sum()) * dx * px / 1e6, 1),
        "bounds_deg": {
            "west": math.degrees(transform.c / radius),
            "east": math.degrees((transform.c + px * ctx_elev.shape[1]) / radius),
            "south": math.degrees((transform.f - px * ctx_elev.shape[0]) / radius),
            "north": math.degrees(transform.f / radius),
        },
        "slope_deg": {
            "ctx_median": round(float(np.median(a)), 2),
            "hirise_median": round(float(np.median(b)), 2),
            "mean_difference_ctx_minus_hirise": round(float(d.mean()), 2),
            "median_absolute_difference": round(float(np.median(np.abs(d))), 2),
            "rmse": round(float(np.sqrt((d * d).mean())), 2),
            "pearson_r": round(float(np.corrcoef(a, b)[0, 1]), 3),
            "within_2_deg_pct": round(float((np.abs(d) <= 2).mean() * 100), 1),
            "within_5_deg_pct": round(float((np.abs(d) <= 5).mean() * 100), 1),
        },
        "blocked_cells_over_s_max": {
            "s_max_deg": S_MAX_DEG,
            "ctx_pct": round(float(blocked_ctx.mean() * 100), 2),
            "hirise_pct": round(float(blocked_hi.mean() * 100), 2),
            "same_class_pct": round(float((blocked_ctx == blocked_hi).mean() * 100), 2),
            # Safety-critical case: HiRISE says too steep, CTX says walkable.
            "hirise_blocked_missed_by_ctx_pct_of_hirise_blocked": round(
                float((blocked_hi & ~blocked_ctx).sum() / max(1, blocked_hi.sum()) * 100), 1
            ),
            "ctx_blocked_confirmed_by_hirise_pct": round(
                float(both / max(1, blocked_ctx.sum()) * 100), 1
            ),
            # Same safety-critical case after the 3x3 maximum used by the cost grid.
            "ctx_3x3_max_pct": round(float(blocked_ctx_60m.mean() * 100), 2),
            "hirise_blocked_missed_by_ctx_3x3_max_pct_of_hirise_blocked": round(
                float((blocked_hi & ~blocked_ctx_60m).sum() / max(1, blocked_hi.sum()) * 100),
                1,
            ),
        },
        "elevation_difference_m": {
            "mean_ctx_minus_hirise": round(float(dz.mean()), 2),
            "std": round(float(dz.std()), 2),
        },
    }
    args.out.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
