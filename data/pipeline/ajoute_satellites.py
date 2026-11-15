"""Ajoute aux fichiers data/regions/<id>.json les mesures satellite calculées à part, sans tout retélécharger :
pluie GPM IMERG recoupée avec NASA POWER (data/raw/imerg.json) et ECOSTRESS (data/raw/ecostress.json).

Usage : python3 ajoute_satellites.py      (build_regions.py fait la même chose à chaque reconstruction)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from climat_complet import lire_serie
from imerg import recoupement
from indicators import pluie_mm_mois

ICI = Path(__file__).resolve().parent
REGIONS = ICI.parent.parent / "frontend" / "src" / "lib" / "regions.json"
RAW = ICI.parent / "raw"
SORTIE = ICI.parent / "regions"


def main() -> int:
    regions = json.loads(REGIONS.read_text(encoding="utf-8"))
    imerg_f, eco_f = RAW / "imerg.json", RAW / "ecostress.json"
    imerg = json.loads(imerg_f.read_text(encoding="utf-8")) if imerg_f.exists() else {}
    eco = json.loads(eco_f.read_text(encoding="utf-8")) if eco_f.exists() else {}
    for r in regions:
        f = SORTIE / f"{r['id']}.json"
        c = json.loads(f.read_text(encoding="utf-8"))
        reel = c["meta"]["reel"]
        if imerg.get(r["id"]):
            brut = json.loads((RAW / "power" / f"{r['id']}.json").read_text(encoding="utf-8"))
            pluie_mois = {k: (pluie_mm_mois(v, *k) if v != -999.0 else None) for k, v in lire_serie(brut, "PRECTOTCORR").items()}
            rec = recoupement(imerg[r["id"]], pluie_mois)
            if rec:
                c["imerg"] = rec
                if "pluie satellite" not in reel:
                    reel.append("pluie satellite")
        if eco.get(r["id"]):
            c["ecostress"] = eco[r["id"]]
            if "stress thermique" not in reel:
                reel.append("stress thermique")
        f.write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        i = c.get("imerg")
        if i:
            print(f"{r['chefLieu']:<16} POWER {i['annuelPower']:>5} mm  IMERG {i['annuel']:>5} mm  écart {i['ecartPct']:>+4} %  r = {i['correlation']}  {i['accord']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
