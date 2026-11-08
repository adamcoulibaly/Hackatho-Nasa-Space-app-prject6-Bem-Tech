"""Eau stockée GRACE / GRACE-FO (NASA GIBS) des 33 chefs-lieux, 2005–2022 → data/raw/grace.json.

Usage : python3 build_grace.py      (puis python3 build_regions.py)
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from build_ndvi import lire_tuile_url
from grace_gibs import COUCHE, URL, ZOOM, dates_par_mois
from ndvi_gibs import charger_palette, ndvi_au_point, position_tuile

ICI = Path(__file__).resolve().parent
REGIONS = ICI.parent.parent / "frontend" / "src" / "lib" / "regions.json"
CAPACITES = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities"
PALETTE_URL = f"https://gibs.earthdata.nasa.gov/colormaps/v1.3/{COUCHE}.xml"
SORTIE = ICI.parent / "raw" / "grace.json"


def lire(url: str) -> str:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "forosat-hackathon"}), timeout=180) as r:
        return r.read().decode("utf-8", errors="ignore")


def main() -> int:
    xml = lire(CAPACITES)
    i = xml.find(f"<ows:Identifier>{COUCHE}</ows:Identifier>")
    bloc = xml[xml.rfind("<Layer>", 0, i) : xml.find("</Layer>", i)]
    dates = {m: d for m, d in dates_par_mois(re.findall(r"<Value>(.*?)</Value>", bloc)).items() if m >= "200501"}
    palette = charger_palette(lire(PALETTE_URL))
    regions = json.loads(REGIONS.read_text(encoding="utf-8"))

    def un_mois(item: tuple[str, str]) -> tuple[str, dict[str, Optional[float]]]:
        mois, jour = item
        cache: dict[tuple[int, int], Optional[bytes]] = {}
        valeurs = {}
        for r in regions:
            tx, ty, px, py = position_tuile(r["lat"], r["lon"], ZOOM)
            if (tx, ty) not in cache:
                cache[(tx, ty)] = lire_tuile_url(URL.format(couche=COUCHE, date=jour, z=ZOOM, x=tx, y=ty))
            png = cache[(tx, ty)]
            valeurs[r["id"]] = ndvi_au_point(png, px, py, palette, 0, 1) if png else None
        return mois, valeurs

    resultat: dict[str, dict[str, Optional[float]]] = {r["id"]: {} for r in regions}
    with ThreadPoolExecutor(max_workers=8) as pool:
        for mois, valeurs in pool.map(un_mois, sorted(dates.items())):
            for rid, v in valeurs.items():
                resultat[rid][mois] = v
    SORTIE.write_text(json.dumps(resultat, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(f"écrit {SORTIE} — {len(dates)} mois publiés, de {min(dates)} à {max(dates)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
