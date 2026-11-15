#!/usr/bin/env python3
"""Collect candidate habitat and science-stop sites from NASA Mars Trek.

Sources (NASA Mars Trek feature services used by its Jezero bookmarks):
    mars2020_waypoints   "Jezero Crater Features and Landforms" bookmark
    mastcam_z_waypoints  "Perseverance Landing Site" bookmark (Mastcam-Z tour)

For every point it records the official name, coordinates, the first
sentences of the NASA description page, and checks it against the cost grid:
walkable or blocked, and straight-line distance from the proposed habitat.

Output: data/candidate_sites.json

Usage:
    python preprocessing/build_candidate_sites.py
"""

import html
import json
import math
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SERVICE = "https://trek.nasa.gov/mars/trekarcgis/rest/services/{}/MapServer/0/query"
LAYERS = {
    "mars2020_waypoints": "Jezero Crater Features and Landforms",
    "mastcam_z_waypoints": "Perseverance Landing Site (Mastcam-Z tour)",
}
# Proposed habitat: Perseverance landing site, Mastcam-Z tour point 1.
HABITAT = {"layer": "mastcam_z_waypoints", "name": "Point of Interest (POI) 1"}
WALK_BACK_KM = 10.0


def get(url):
    with urllib.request.urlopen(url, timeout=60) as resp:
        return resp.read().decode("utf-8", "replace")


def summary(url, sentences=2):
    """First sentences of a NASA Mars Trek description page, as plain text."""
    try:
        s = get(url)
    except OSError:
        return None
    s = re.sub(r"<(script|style).*?</\1>", "", s, flags=re.S)
    text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()
    text = re.sub(r"^POI \d+ ", "", text)
    parts = re.split(r"(?<=[.!?])\s+", text)
    return " ".join(parts[:sentences]) or None


def main():
    grid = json.loads((REPO / "data" / "cost_grid.json").read_text())
    m = grid["meta"]
    b, cell, radius = m["bounds_deg"], m["cell_size_deg"], m["body_radius_m"]

    def grid_status(lat, lon):
        x = math.floor((lon - b["west"]) / cell["lon"])
        y = math.floor((b["north"] - lat) / cell["lat"])
        if not (0 <= x < m["cols"] and 0 <= y < m["rows"]):
            return "outside_grid", None
        i = y * m["cols"] + x
        return ("blocked" if grid["cost"][i] < 0 else "walkable"), grid["slope_deg"][i]

    sites = []
    for layer, bookmark in LAYERS.items():
        q = "?where=1%3D1&outFields=name,template&returnGeometry=true&outSR=4326&f=json"
        data = json.loads(get(SERVICE.format(layer) + q))
        for f in data["features"]:
            a, g = f["attributes"], f["geometry"]
            status, slope = grid_status(g["y"], g["x"])
            sites.append({
                "name": a["name"],
                "lat": round(g["y"], 5),
                "lon": round(g["x"], 5),
                "bookmark": bookmark,
                "service_layer": layer,
                "nasa_description_url": a.get("template"),
                "nasa_summary": summary(a["template"]) if a.get("template") else None,
                "grid_status": status,
                "slope_deg": slope,
            })

    hab = next(s for s in sites if s["service_layer"] == HABITAT["layer"]
               and s["name"] == HABITAT["name"])
    rad = math.pi / 180
    for s in sites:
        c = (math.sin(hab["lat"] * rad) * math.sin(s["lat"] * rad)
             + math.cos(hab["lat"] * rad) * math.cos(s["lat"] * rad)
             * math.cos((s["lon"] - hab["lon"]) * rad))
        s["straight_km_from_habitat"] = round(math.acos(max(-1, min(1, c))) * radius / 1000, 2)
        s["within_walk_back"] = s["straight_km_from_habitat"] <= WALK_BACK_KM

    out = {
        "meta": {
            "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "description": "Candidate habitat and science stops from NASA Mars Trek "
            "Jezero bookmarks, checked against the MarsWalk cost grid. Candidates only: "
            "the final choice is made by the Science & content role.",
            "source": "NASA Mars Trek (NASA/JPL), https://trek.nasa.gov/mars/",
            "services": [SERVICE.format(layer).rsplit("/query", 1)[0] for layer in LAYERS],
            "proposed_habitat": {"name": hab["name"], "lat": hab["lat"], "lon": hab["lon"],
                                 "note": "Perseverance landing site (Mastcam-Z tour point 1)"},
            "walk_back_km": WALK_BACK_KM,
            "distance_note": "straight-line distance on the Mars sphere; the walking "
            "route is longer (see web/route.js)",
        },
        "sites": sites,
    }
    path = REPO / "data" / "candidate_sites.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    for s in sites:
        print(f"{s['name']:<30} {s['grid_status']:<13} {s['straight_km_from_habitat']:>6} km")
    print(f"wrote {path}")


if __name__ == "__main__":
    main()
