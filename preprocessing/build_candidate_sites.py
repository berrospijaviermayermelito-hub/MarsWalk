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

from ai_disclosure import AI_ASSISTANCE

REPO = Path(__file__).resolve().parent.parent
SERVICE = "https://trek.nasa.gov/mars/trekarcgis/rest/services/{}/MapServer/0/query"
LAYERS = {
    "mars2020_waypoints": "Jezero Crater Features and Landforms",
    "mastcam_z_waypoints": "Perseverance Landing Site (Mastcam-Z tour)",
}
# Perseverance's traverse (NASA Mars Trek feature service). The proposed habitat
# is the start of the earliest drive in this data set, i.e. where the rover
# stood after landing. NASA calls the landing site "Octavia E. Butler"
# (NASA Science, "Perseverance's Route to the Delta").
TRAVERSE = "https://trek.nasa.gov/mars/trekarcgis/rest/services/Perseverance_Traverse_Path/MapServer/0"
WALK_BACK_KM = 10.0
NEAR_M = 150.0

# Stops chosen by the team (docs/TEAM_RULES.md): id -> (Mars Trek point, display
# name taken from the NASA text, mineral/feature, instrument, extra fields).
SELECTED_STOPS = {
    "A": ("POI 4", "S\u00e9\u00edtah", "Mostly olivine", "Perseverance",
          {"mineral_source_url": "https://science.nasa.gov/blog/perseverance-and-the-search-amongst-the-sand/"}),
    "B": ("POI 5", "Delta front", "Ancient delta deposit", "Mastcam-Z", {}),
    "C": ("POI 7", "Belva crater", "Delta fan deposit stratigraphy", "Mastcam-Z", {}),
}

# Extra facts from NASA pages, quoted verbatim, keyed by Mars Trek point name.
NASA_NOTES = {
    "POI 4": {
        "quote": "Since February 18, 2021, Perseverance has been exploring the Jezero "
        "crater floor, including an exposure of rock and sand that the rover’s science "
        "team calls Séítah (which means “amongst the sand” in the Navajo language). "
        "[...] the eastern side of Séítah, which itself was considered too sandy and "
        "rocky for a safe landing. [...] The rocks in Séítah have a very interesting "
        "composition, and are mostly comprised of the mineral olivine.",
        "source": "NASA Science, 'Perseverance and the Search Amongst the Sand' (2021-12-22)",
        "url": "https://science.nasa.gov/blog/perseverance-and-the-search-amongst-the-sand/",
        "planning_note": "Sand is not resolved by the 20 m DEM: the cost grid can mark "
        "Séítah as walkable even where NASA describes sandy terrain.",
    },
}


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

    q = "?where=1%3D1&outFields=sol,SCLK_START&returnGeometry=true&outSR=4326&f=json"
    drives = json.loads(get(TRAVERSE + "/query" + q))["features"]
    first = min(drives, key=lambda f: (f["attributes"]["sol"], f["attributes"]["SCLK_START"]))
    lon0, lat0 = first["geometry"]["paths"][0][0]
    hab = {"lat": round(lat0, 5), "lon": round(lon0, 5), "first_drive_sol": first["attributes"]["sol"]}
    for s in sites:
        if s["name"] in NASA_NOTES:
            s["nasa_notes"] = NASA_NOTES[s["name"]]

    # Sols when Perseverance drove within NEAR_M of each site (to find its photos
    # in the raw image gallery with the Sol filter).
    rad = math.pi / 180
    def dist_m(lon1, lat1, lon2, lat2):
        x = (lon1 - lon2) * rad * math.cos(lat2 * rad) * radius
        y = (lat1 - lat2) * rad * radius
        return math.hypot(x, y)
    for s in sites:
        near = sorted({f["attributes"]["sol"] for f in drives
                       if min(dist_m(v[0], v[1], s["lon"], s["lat"])
                              for path in f["geometry"]["paths"] for v in path) <= NEAR_M})
        s["perseverance_drive_sols_within_150m"] = near
    rad = math.pi / 180
    for s in sites:
        c = (math.sin(hab["lat"] * rad) * math.sin(s["lat"] * rad)
             + math.cos(hab["lat"] * rad) * math.cos(s["lat"] * rad)
             * math.cos((s["lon"] - hab["lon"]) * rad))
        s["straight_km_from_habitat"] = round(math.acos(max(-1, min(1, c))) * radius / 1000, 2)
        s["within_walk_back"] = s["straight_km_from_habitat"] <= WALK_BACK_KM

    out = {
        "meta": {
            "ai_assistance": AI_ASSISTANCE,
            "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "description": "Candidate habitat and science stops from NASA Mars Trek "
            "Jezero bookmarks, checked against the MarsWalk cost grid. Candidates only: "
            "the final choice is made by the Science & content role.",
            "source": "NASA Mars Trek (NASA/JPL), https://trek.nasa.gov/mars/",
            "services": [SERVICE.format(layer).rsplit("/query", 1)[0] for layer in LAYERS] + [TRAVERSE],
            "proposed_habitat": {
                "lat": hab["lat"], "lon": hab["lon"],
                "note": f"start of Perseverance's earliest drive (sol {hab['first_drive_sol']}) "
                "in NASA's traverse data, i.e. the landing site, which NASA calls "
                "'Octavia E. Butler'",
                "sources": [TRAVERSE,
                            "https://science.nasa.gov/photojournal/perseverances-route-to-the-delta-2/"],
            },
            "walk_back_km": WALK_BACK_KM,
            "distance_note": "straight-line distance on the Mars sphere; the walking "
            "route is longer (see web/route.js)",
            "sols_note": "perseverance_drive_sols_within_150m lists the sols of the drives "
            "in NASA's traverse data that passed within 150 m of the site; use them with the "
            "Sol filter of https://mars.nasa.gov/mars2020/multimedia/raw-images/",
        },
        "sites": sites,
    }
    # Team decision: habitat at the landing site and three stops (see docs/TEAM_RULES.md).
    by_name = {s["name"]: s for s in sites}
    stops = []
    for sid, (name, label, mineral, instrument, extra) in SELECTED_STOPS.items():
        s = by_name[name]
        stop = {
            "id": sid,
            "name": label,
            "latlng": [s["lat"], s["lon"]],
            "mineral": mineral,
            "instrument": instrument,
            "briefing": s["nasa_summary"],
            "task": None,
            "source_url": s["nasa_description_url"],
            "mars_trek_point": name,
            "perseverance_drive_sols_within_150m": s["perseverance_drive_sols_within_150m"],
        }
        stop.update(extra)
        stops.append(stop)
    stops_out = {
        "meta": {
            "ai_assistance": AI_ASSISTANCE,
            "description": "Habitat and science stops chosen by the team from "
            "data/candidate_sites.json. Names, briefings and facts are NASA text; "
            "'task' is left empty for the science team.",
            "source": "NASA Mars Trek points of interest and Perseverance traverse "
            "(see DATA_SOURCES.md)",
        },
        "habitat": {
            "name": "Habitat (Perseverance landing site)",
            "latlng": [hab["lat"], hab["lon"]],
            "note": f"Start of Perseverance's earliest drive (sol {hab['first_drive_sol']}) "
            "in NASA's traverse data. NASA calls the landing site 'Octavia E. Butler'.",
            "source_url": "https://science.nasa.gov/photojournal/perseverances-route-to-the-delta-2/",
        },
        "stops": stops,
    }
    spath = REPO / "data" / "stops.json"
    spath.write_text(json.dumps(stops_out, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {spath}")

    path = REPO / "data" / "candidate_sites.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    for s in sites:
        print(f"{s['name']:<30} {s['grid_status']:<13} {s['straight_km_from_habitat']:>6} km")
    print(f"wrote {path}")


if __name__ == "__main__":
    main()
