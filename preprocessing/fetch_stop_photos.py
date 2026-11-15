#!/usr/bin/env python3
"""Download the NASA Perseverance photo chosen for each science stop.

The photos are official NASA releases (Photojournal "PIA" images) taken by
Perseverance's Mastcam-Z at each stop. Titles, dates, sols and credits are
copied from the NASA pages listed in STOP_PHOTOS. Images wider than MAX_WIDTH
pixels are resized (never cropped or edited) so the web app stays light.

Output: data/photos/<PIA id>.jpg

Usage:
    python preprocessing/fetch_stop_photos.py
"""

import io
import urllib.request
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
MAX_WIDTH = 2400

# Stop id -> photo metadata. Every text field is quoted from the NASA page in
# "source_url". "distance_from_stop_m" is computed from NASA's traverse data
# (rover position on those sols, see preprocessing/build_traverse.py).
STOP_PHOTOS = {
    "A": {
        "pia": "PIA24816",
        "title": "Perseverance Rover's View of South Séítah",
        "description": "Composed of 84 enhanced-color images [...] the mosaic was taken on "
        "Sept. 12, 2021 (the 201st Martian day, or sol, of the mission), by the Mastcam-Z "
        "imager as the rover was parked on an elevated overlook just outside its entry point "
        "into South Séítah.",
        "date": "2021-09-12",
        "sols": [201],
        "instrument": "Mastcam-Z",
        "credit": "NASA/JPL-Caltech/ASU/MSSS",
        "source_url": "https://science.nasa.gov/photojournal/perseverance-rovers-view-of-south-seitah/",
        "image_url": "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia24/pia24816/PIA24816.jpg",
        "distance_from_stop_m": 80,
    },
    "B": {
        "pia": "PIA24921",
        "title": "Perseverance Explores the Jezero Crater Delta",
        "description": "Those images were acquired on June 12, 13, 16, 17, and 20, 2022 (the "
        "466th, 467th, 470th, 471st, and 474th Martian day, or sol, of Perseverance's mission).",
        "date": "2022-06-12/2022-06-20",
        "sols": [466, 467, 470, 471, 474],
        "instrument": "Mastcam-Z",
        "credit": "NASA/JPL-Caltech/ASU/MSSS",
        "source_url": "https://science.nasa.gov/resource/perseverance-explores-the-jezero-crater-delta/",
        "image_url": "https://assets.science.nasa.gov/content/dam/science/psd/mars/resources/detail_files/2/6/26979_PIA24921-web.jpg",
        "distance_from_stop_m": 1,
    },
    "C": {
        "pia": "PIA25889",
        "title": "Perseverance Takes in View at Belva Crater",
        "description": "This view of the interior of Belva Crater was generated using data "
        "collected by the Mastcam-Z instrument aboard NASA's Perseverance Mars rover on April "
        "22, 2023, the 772nd Martian day, or sol, of the mission. When the 152 individual images "
        "that make up this mosaic were taken, the rover was parked at the west side of the "
        "crater's rim, on a light-toned rocky outcrop the science team is calling “Echo Creek.”",
        "date": "2023-04-22",
        "sols": [772],
        "instrument": "Mastcam-Z",
        "credit": "NASA/JPL-Caltech/ASU/MSSS",
        "source_url": "https://science.nasa.gov/resource/perseverance-takes-in-view-at-belva-crater/",
        "image_url": "https://assets.science.nasa.gov/content/dam/science/psd/mars/resources/detail_files/2/7/27471_PIA25889-web.jpg",
        "distance_from_stop_m": 30,
    },
}


def photo_path(stop_id):
    return f"data/photos/{STOP_PHOTOS[stop_id]['pia']}.jpg"


def main():
    Image.MAX_IMAGE_PIXELS = None  # PIA mosaics are very large but trusted NASA files
    out = REPO / "data" / "photos"
    out.mkdir(parents=True, exist_ok=True)
    for sid, p in STOP_PHOTOS.items():
        with urllib.request.urlopen(p["image_url"], timeout=300) as resp:
            im = Image.open(io.BytesIO(resp.read())).convert("RGB")
        w, h = im.size
        if w > MAX_WIDTH:
            im = im.resize((MAX_WIDTH, round(h * MAX_WIDTH / w)), Image.LANCZOS)
        path = REPO / photo_path(sid)
        im.save(path, quality=85, optimize=True)
        print(f"stop {sid}: {p['pia']} {w}x{h} -> {im.size[0]}x{im.size[1]}, "
              f"{path.stat().st_size / 1e3:.0f} kB")


if __name__ == "__main__":
    main()
