"""Climat complet et réel (NASA POWER) des 33 régions et districts, au chef-lieu de chacun.

Télécharge les séries mensuelles (2005–2025) et les 45 derniers jours, ajoute le NDVI MODIS de data/raw/ndvi.json
(build_ndvi.py) s'il existe, puis écrit data/regions/<id>.json.
Usage : python3 build_regions.py [--rafraichir]   (--rafraichir retélécharge aussi les séries mensuelles)
"""
from __future__ import annotations

import json
import sys
import time
from datetime import date, timedelta
from pathlib import Path

from climat_complet import climat_complet
from fetch_power import telecharger, telecharger_jours

ICI = Path(__file__).resolve().parent
REGIONS = ICI.parent.parent / "frontend" / "src" / "lib" / "regions.json"
RAW = ICI.parent / "raw" / "power"
SORTIE = ICI.parent / "regions"
NDVI = ICI.parent / "raw" / "ndvi.json"  # produit par build_ndvi.py (facultatif)
GRACE = ICI.parent / "raw" / "grace.json"  # produit par build_grace.py (facultatif)
IMERG = ICI.parent / "raw" / "imerg.json"  # produit par build_imerg.py (facultatif)


def main(argv: list[str]) -> int:
    rafraichir = "--rafraichir" in argv
    aujourd_hui = date.today()
    debut_j, fin_j = (aujourd_hui - timedelta(days=45)).strftime("%Y%m%d"), (aujourd_hui - timedelta(days=1)).strftime("%Y%m%d")
    regions = json.loads(REGIONS.read_text(encoding="utf-8"))
    ndvi = json.loads(NDVI.read_text(encoding="utf-8")) if NDVI.exists() else {}
    grace = json.loads(GRACE.read_text(encoding="utf-8")) if GRACE.exists() else {}
    imerg = json.loads(IMERG.read_text(encoding="utf-8")) if IMERG.exists() else {}
    RAW.mkdir(parents=True, exist_ok=True)
    SORTIE.mkdir(parents=True, exist_ok=True)
    for r in regions:
        mensuel_f = RAW / f"{r['id']}.json"
        if rafraichir or not mensuel_f.exists() or "GWETROOT" not in mensuel_f.read_text(encoding="utf-8"):
            mensuel_f.write_bytes(telecharger(r["lat"], r["lon"]))
            time.sleep(1)
        jours = json.loads(telecharger_jours(r["lat"], r["lon"], debut_j, fin_j))
        time.sleep(1)
        c = climat_complet(json.loads(mensuel_f.read_text(encoding="utf-8")), jours, r, aujourd_hui, ndvi=ndvi.get(r["id"]), grace=grace.get(r["id"]), imerg=imerg.get(r["id"]))
        (SORTIE / f"{r['id']}.json").write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        etat = c.get("actuel", {}).get("texte", "pas d'état du moment")
        print(f"{r['chefLieu']:<16} {c['indicateurs'][1]['valeur']:>9}  {c['indicateurs'][0]['valeur']:<22} {etat}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
