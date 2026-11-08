"""Série NDVI mensuelle MODIS (NASA GIBS) des 33 chefs-lieux, 2005–2025 → data/raw/ndvi.json.

Usage : python3 build_ndvi.py      (puis python3 build_regions.py)
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from ndvi_gibs import COUCHE, URL, ZOOM, charger_palette, serie_ndvi

ICI = Path(__file__).resolve().parent
REGIONS = ICI.parent.parent / "frontend" / "src" / "lib" / "regions.json"
PALETTE_URL = "https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_L3_NDVI.xml"
SORTIE = ICI.parent / "raw" / "ndvi.json"


def lire_tuile(date: str, x: int, y: int) -> Optional[bytes]:
    return lire_tuile_url(URL.format(couche=COUCHE, date=date, z=ZOOM, x=x, y=y))


def lire_tuile_url(url: str) -> Optional[bytes]:
    """PNG de la tuile, None si elle n'existe pas (404) ou reste injoignable après 3 essais."""
    for essai in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "forosat-hackathon"}), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
        except Exception:
            pass
        time.sleep(2 * (essai + 1))
    return None


def main() -> int:
    with urllib.request.urlopen(urllib.request.Request(PALETTE_URL, headers={"User-Agent": "forosat-hackathon"}), timeout=60) as r:
        palette = charger_palette(r.read().decode("utf-8"))
    regions = json.loads(REGIONS.read_text(encoding="utf-8"))
    points = {r["id"]: (r["lat"], r["lon"]) for r in regions}
    mois = [f"{a}{m:02d}" for a in range(2005, 2026) for m in range(1, 13)]

    # Un mois par tâche : les tuiles d'un même mois sont partagées entre régions voisines.
    def un_mois(m: str):
        return m, serie_ndvi(points, [m], lire_tuile, palette)

    resultat: dict[str, dict[str, Optional[float]]] = {pid: {} for pid in points}
    with ThreadPoolExecutor(max_workers=8) as pool:
        for i, (m, s) in enumerate(pool.map(un_mois, mois), 1):
            for pid, v in s.items():
                resultat[pid][m] = v[m]
            if i % 24 == 0:
                print(f"{i}/{len(mois)} mois", flush=True)
    SORTIE.write_text(json.dumps(resultat, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    manquants = sum(1 for s in resultat.values() for v in s.values() if v is None)
    print(f"écrit {SORTIE} — {manquants} valeurs manquantes sur {len(points) * len(mois)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
