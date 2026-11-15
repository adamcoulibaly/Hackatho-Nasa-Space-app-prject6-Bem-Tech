"""Pluie mensuelle GPM IMERG V07 (NASA GES DISC) des 33 chefs-lieux, 2005–2025 → data/raw/imerg.json.

GES DISC demande un compte NASA Earthdata : la requête doit porter un jeton (en-tête Authorization: Bearer),
lu dans la variable EARTHDATA_TOKEN (ou ajouté par le proxy de l'environnement).
Usage : python3 build_imerg.py      (puis python3 ajoute_satellites.py, ou build_regions.py)
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from imerg import URL, fenetre, lire_ascii, mm_par_mois, pluie_au_point

ICI = Path(__file__).resolve().parent
REGIONS = ICI.parent.parent / "frontend" / "src" / "lib" / "regions.json"
SORTIE = ICI.parent / "raw" / "imerg.json"


def lire(url: str) -> Optional[str]:
    entetes = {"User-Agent": "forosat-hackathon"}
    jeton = os.environ.get("EARTHDATA_TOKEN")
    if jeton:
        entetes["Authorization"] = f"Bearer {jeton}"
    for essai in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=entetes), timeout=120) as r:
                return r.read().decode("utf-8", errors="ignore")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None  # mois pas encore publié
            if essai == 2:
                raise
        except urllib.error.URLError:
            if essai == 2:
                raise
    return None


def main() -> int:
    regions = json.loads(REGIONS.read_text(encoding="utf-8"))
    x0, x1, y0, y1 = fenetre((r["lat"], r["lon"]) for r in regions)
    mois = [(a, m) for a in range(2005, 2026) for m in range(1, 13)]

    def un_mois(am: tuple[int, int]) -> tuple[str, dict[str, Optional[float]]]:
        a, m = am
        texte = lire(URL.format(a=a, m=m, x0=x0, x1=x1, y0=y0, y1=y1).replace("[", "%5B").replace("]", "%5D"))
        if texte is None:
            return f"{a}{m:02d}", {}
        grille = lire_ascii(texte)
        res = {}
        for r in regions:
            v = pluie_au_point(grille, x0, y0, r["lat"], r["lon"])
            res[r["id"]] = round(mm_par_mois(v, a, m), 1) if v is not None else None
        return f"{a}{m:02d}", res

    resultat: dict[str, dict[str, Optional[float]]] = {r["id"]: {} for r in regions}
    publies = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        for cle, valeurs in pool.map(un_mois, mois):
            if valeurs:
                publies.append(cle)
            for rid, v in valeurs.items():
                resultat[rid][cle] = v
    SORTIE.write_text(json.dumps(resultat, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(f"écrit {SORTIE} — {len(publies)} mois publiés, de {min(publies)} à {max(publies)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
