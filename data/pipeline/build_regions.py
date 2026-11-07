"""Climat réel (NASA POWER) des 33 régions et districts, au chef-lieu de chacun.

Télécharge ce qui manque dans data/raw/power/<id>.json, puis écrit data/regions/<id>.json.
Usage : python3 build_regions.py [--rafraichir]
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from build_climat import CLIMAT, REGIONS, climat_reel
from fetch_power import telecharger

ICI = Path(__file__).resolve().parent
RAW = ICI.parent / "raw" / "power"
SORTIE = ICI.parent / "regions"


def main(argv: list[str]) -> int:
    rafraichir = "--rafraichir" in argv
    regions = json.loads(REGIONS.read_text(encoding="utf-8"))
    modele = json.loads(CLIMAT.read_text(encoding="utf-8"))
    RAW.mkdir(parents=True, exist_ok=True)
    SORTIE.mkdir(parents=True, exist_ok=True)
    for r in regions:
        brut_f = RAW / f"{r['id']}.json"
        if rafraichir or not brut_f.exists():
            brut_f.write_bytes(telecharger(r["lat"], r["lon"]))
            time.sleep(1)
        c = climat_reel(modele, json.loads(brut_f.read_text(encoding="utf-8")), r)
        (SORTIE / f"{r['id']}.json").write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{r['chefLieu']:<16} {c['indicateurs'][1]['valeur']:>9}  {c['indicateurs'][0]['valeur']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
