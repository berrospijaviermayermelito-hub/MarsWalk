#!/usr/bin/env python3
"""Summarize Perseverance MEDA weather by season and time of sol.

Pipeline:
    NASA PDS Atmospheres Node (one CSV per sol and sensor)
    -> hourly means per sampled sol (cached in data/raw/meda_hourly/)
    -> typical values per solar-longitude bin and local hour
    -> data/meda_summary.json

There is no live Mars weather. The output describes TYPICAL conditions at
Jezero crater for a season (solar longitude, Ls) and local true solar hour.

Source: Mars 2020 MEDA bundle, doi:10.17189/1522849 (see DATA_SOURCES.md).

Usage:
    python preprocessing/build_meda_summary.py
    python preprocessing/build_meda_summary.py --step 6      # denser sampling
    python preprocessing/build_meda_summary.py --self-test
"""

import argparse
import csv
import io
import json
import math
import ssl
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parent.parent
BASE = "https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda"
SOL_GROUPS = [(0, 89), (90, 179), (180, 299)] + [
    (a, a + 119) for a in range(300, 3000, 120)
]

# (collection, sensor tag in the file name, {output name: [CSV columns]})
# Several columns for one output are combined with the median per sample.
PRODUCTS = [
    # Air temperature sensors 1-3 sit on the mast at ~1.45 m above the ground.
    (
        "data_calibrated_env",
        "CAL_ATS_________________",
        {"air_temp_k": ["ATS_LOCAL_TEMP1", "ATS_LOCAL_TEMP2", "ATS_LOCAL_TEMP3"]},
    ),
    ("data_calibrated_env", "CAL_TIRS________________", {"ground_temp_k": ["GROUND_TEMP"]}),
    ("data_derived_env", "DER_PS__________________", {"pressure_pa": ["PRESSURE"]}),
    ("data_derived_env", "DER_WS__________________", {"wind_speed_ms": ["HORIZONTAL_WIND_SPEED"]}),
]
VARIABLES = ["air_temp_k", "ground_temp_k", "pressure_pa", "wind_speed_ms"]
VALID_RANGE = {
    "air_temp_k": (120.0, 330.0),
    "ground_temp_k": (120.0, 350.0),
    "pressure_pa": (400.0, 1200.0),
    "wind_speed_ms": (0.0, 100.0),
}

LS_BIN_DEG = 30
SEASONS = ["Northern spring", "Northern summer", "Northern autumn", "Northern winter"]

# Perseverance landed 2021-02-18 20:55 UTC (sol 0). One sol = 88775.244 s.
LANDING_UTC = datetime(2021, 2, 18, 20, 55, tzinfo=timezone.utc)
SOL_SECONDS = 88775.244


def solar_longitude(when_utc):
    """Areocentric solar longitude Ls (deg), Allison & McEwen (2000), as used
    by NASA GISS Mars24."""
    jd_utc = when_utc.timestamp() / 86400.0 + 2440587.5
    dt = jd_utc + 69.184 / 86400.0 - 2451545.0  # TT days since J2000
    m = math.radians(19.3871 + 0.52402073 * dt)
    alpha_fms = 270.3871 + 0.524038496 * dt
    pbs = sum(
        a * math.cos(math.radians(0.985626 * dt / tau + phi))
        for a, tau, phi in (
            (0.0071, 2.2353, 49.409),
            (0.0057, 2.7543, 168.173),
            (0.0039, 1.1177, 191.837),
            (0.0037, 15.7866, 21.736),
            (0.0021, 2.1354, 15.704),
            (0.0020, 2.4694, 95.528),
            (0.0018, 32.8493, 49.095),
        )
    )
    eoc = (
        (10.691 + 3.0e-7 * dt) * math.sin(m)
        + 0.623 * math.sin(2 * m)
        + 0.050 * math.sin(3 * m)
        + 0.005 * math.sin(4 * m)
        + 0.0005 * math.sin(5 * m)
        + pbs
    )
    return (alpha_fms + eoc) % 360.0


def sol_to_ls(sol):
    return solar_longitude(LANDING_UTC + timedelta(seconds=(sol + 0.5) * SOL_SECONDS))


def ssl_context():
    """The PDS node's certificate chains to a root that some system trust
    stores lack; the Mozilla bundle shipped by certifi includes it."""
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


CTX = ssl_context()


def http_get(url):
    with urllib.request.urlopen(url, context=CTX, timeout=180) as resp:
        return resp.read().decode("utf-8", "replace")


def sol_dir(collection, sol):
    lo, hi = next(g for g in SOL_GROUPS if g[0] <= sol <= g[1])
    return f"{BASE}/{collection}/sol_{lo:04d}_{hi:04d}/sol_{sol:04d}/"


def find_file(collection, tag, sol):
    """Return the URL of the highest-version CSV for a sensor, or None."""
    url = sol_dir(collection, sol)
    try:
        listing = http_get(url)
    except urllib.error.HTTPError:
        return None
    names = sorted(
        {
            part.split('"')[0]
            for part in listing.split('href="')[1:]
            if tag in part.split('"')[0] and part.split('"')[0].endswith(".CSV")
        }
    )
    return url + names[-1] if names else None


def hourly_means(text, columns_by_var):
    """Mean per local true solar hour (0-23) for each output variable."""
    sums = {v: np.zeros(24) for v in columns_by_var}
    counts = {v: np.zeros(24, dtype=int) for v in columns_by_var}
    for row in csv.DictReader(io.StringIO(text)):
        try:
            hour = int(row["LTST"].split()[1][:2])  # "0300 00:31:49"
        except (KeyError, IndexError, ValueError):
            continue
        if not 0 <= hour <= 23:
            continue
        for var, cols in columns_by_var.items():
            lo, hi = VALID_RANGE[var]
            vals = []
            for c in cols:
                try:
                    x = float(row[c])
                except (KeyError, TypeError, ValueError):
                    continue
                if lo <= x <= hi:  # drops blanks and 999999999 fill values
                    vals.append(x)
            if vals:
                sums[var][hour] += float(np.median(vals))
                counts[var][hour] += 1
    out = {}
    for var in columns_by_var:
        # Require at least 5 minutes of 1 Hz samples to trust an hourly mean.
        ok = counts[var] >= 300
        out[var] = [
            round(sums[var][h] / counts[var][h], 2) if ok[h] else None for h in range(24)
        ]
    return out


def process_sol(sol, cache_dir):
    """Download one sol, reduce it to hourly means and cache the result."""
    cache = cache_dir / f"sol_{sol:04d}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    record = {"sol": sol, "ls": round(sol_to_ls(sol), 2), "files": []}
    for collection, tag, columns_by_var in PRODUCTS:
        url = find_file(collection, tag, sol)
        if url is None:
            continue
        try:
            record.update(hourly_means(http_get(url), columns_by_var))
            record["files"].append(url.rsplit("/", 1)[1])
        except (urllib.error.URLError, TimeoutError) as err:
            print(f"  sol {sol}: {tag.strip('_')} failed ({err})", file=sys.stderr)
    if record["files"]:
        cache.write_text(json.dumps(record))
    return record


def stats(values):
    a = np.asarray(values, dtype=float)
    if a.size < 3:
        return None
    return {
        "median": round(float(np.median(a)), 1),
        "p10": round(float(np.percentile(a, 10)), 1),
        "p90": round(float(np.percentile(a, 90)), 1),
        "n": int(a.size),
    }


def summarize(records):
    n_bins = 360 // LS_BIN_DEG
    bins = []
    for b in range(n_bins):
        ls0 = b * LS_BIN_DEG
        recs = [r for r in records if ls0 <= r["ls"] < ls0 + LS_BIN_DEG]
        hourly = {}
        for var in VARIABLES:
            per_hour = []
            for h in range(24):
                vals = [r[var][h] for r in recs if r.get(var) and r[var][h] is not None]
                if var.endswith("_k"):
                    vals = [v - 273.15 for v in vals]
                per_hour.append(stats(vals))
            hourly[var.replace("_k", "_c")] = per_hour
        bins.append(
            {
                "ls_start": ls0,
                "ls_end": ls0 + LS_BIN_DEG,
                "season": SEASONS[ls0 // 90],
                "sols_sampled": sorted(r["sol"] for r in recs),
                "hourly": hourly,
            }
        )
    return bins


def self_test():
    # Perseverance landed at Ls ~5 deg (Mars year 36); northern summer
    # solstice (Ls 90) of MY 36 was on 2021-08-25.
    assert abs(sol_to_ls(0) - 5.6) < 1.0, sol_to_ls(0)
    ls = solar_longitude(datetime(2021, 8, 25, 12, tzinfo=timezone.utc))
    assert abs(ls - 90.0) < 1.0, ls
    text = "SCLK,LMST,LTST,PRESSURE\n" + "".join(
        f"{i},x,0001 05:00:00,{700 + (i % 2)}\n" for i in range(400)
    ) + "1,x,0001 06:00:00,999999999\n"
    out = hourly_means(text, {"pressure_pa": ["PRESSURE"]})["pressure_pa"]
    assert out[5] == 700.5 and out[6] is None, out
    print("self-test OK")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--first-sol", type=int, default=10)
    ap.add_argument("--last-sol", type=int, default=1850)
    ap.add_argument("--step", type=int, default=12, help="use every Nth sol")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--out", type=Path, default=REPO / "data" / "meda_summary.json")
    ap.add_argument("--cache-dir", type=Path, default=REPO / "data" / "raw" / "meda_hourly")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        self_test()
        return

    args.cache_dir.mkdir(parents=True, exist_ok=True)
    sols = list(range(args.first_sol, args.last_sol + 1, args.step))
    print(f"processing {len(sols)} sols ({sols[0]}..{sols[-1]}, step {args.step})")
    records = []
    with ThreadPoolExecutor(args.workers) as pool:
        for i, rec in enumerate(pool.map(lambda s: process_sol(s, args.cache_dir), sols), 1):
            if rec["files"]:
                records.append(rec)
            if i % 20 == 0:
                print(f"  {i}/{len(sols)} sols done")
    if not records:
        sys.exit("No MEDA data could be downloaded.")

    out = {
        "meta": {
            "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "description": "Typical conditions at Jezero crater measured by "
            "Perseverance MEDA, by season (solar longitude Ls) and local true "
            "solar hour. Not a forecast and not live data.",
            "source": "Mars 2020 MEDA PDS4 bundle, NASA PDS Atmospheres Node",
            "source_doi": "10.17189/1522849",
            "source_url": BASE + "/",
            "sols_used": len(records),
            "sol_range": [records[0]["sol"], records[-1]["sol"]],
            "sampling": f"every {args.step}th sol; hourly means of 1 Hz data, "
            "then median and 10th/90th percentiles across sols in each bin",
            "ls_bin_deg": LS_BIN_DEG,
            "ls_method": "Allison & McEwen (2000), evaluated at mid-sol",
            "hour_convention": "index 0-23 = local true solar time (LTST) hour",
            "variables": {
                "air_temp_c": "air temperature at ~1.45 m (ATS sensors 1-3, calibrated), deg C",
                "ground_temp_c": "ground brightness temperature (TIRS, calibrated), deg C",
                "pressure_pa": "atmospheric pressure (PS, derived), Pa",
                "wind_speed_ms": "horizontal wind speed at ~1.5 m (WS, derived), m/s",
            },
            "caveats": [
                "The wind sensor was progressively damaged by wind-blown sand "
                "from early 2022; wind values cover few sols and need caution.",
                "Temperatures can be affected by the rover's own heat.",
                "A null entry means fewer than 3 sampled sols had data for that "
                "bin and hour.",
            ],
        },
        "ls_bins": summarize(records),
    }
    args.out.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {args.out}  ({args.out.stat().st_size / 1e3:.0f} kB), {len(records)} sols")


if __name__ == "__main__":
    main()
