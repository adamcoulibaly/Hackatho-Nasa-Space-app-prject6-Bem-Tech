"""Verdicts de 20 saisons réelles (2005–2025) par culture pour les 33 régions.

Télécharge la série quotidienne NASA POWER de chaque chef-lieu (data/raw/jours/<id>.json, réutilisée si présente),
rejoue chaque saison des pluies principale (data/regions/<id>.json : saisonPluies) pour les 8 cultures avec
saison.verdict_saison, puis écrit data/saisons/<id>.json.
Usage : python3 build_saisons.py
"""
from __future__ import annotations

import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path
from typing import Iterable

from fetch_power import telecharger_serie
from saison import RESERVE_MM, verdict_saison

ICI = Path(__file__).resolve().parent
RACINE = ICI.parent.parent
REGIONS = RACINE / "frontend" / "src" / "lib" / "regions.json"
CULTURES = RACINE / "knowledge" / "cultures.json"
RAW = ICI.parent / "raw" / "jours"
CLIMATS = ICI.parent / "regions"
SORTIE = ICI.parent / "saisons"
ANNEES = range(2005, 2026)


def serie_depuis_power(brut: dict) -> dict:
    """Réponse POWER (journalier) → {"debut", "pluie", "tmax", "tmin"} ; -999 devient None."""
    p = brut["properties"]["parameter"]
    cles = sorted(p["PRECTOTCORR"])
    val = lambda nom: [None if (v := p[nom].get(k, -999)) is None or v <= -999 else round(float(v), 1) for k in cles]
    d = cles[0]
    return {"debut": f"{d[:4]}-{d[4:6]}-{d[6:]}", "pluie": val("PRECTOTCORR"), "tmax": val("T2M_MAX"), "tmin": val("T2M_MIN")}


def table_region(jours: dict, lat: float, saison: dict, cultures: list[dict], annees: Iterable[int] = ANNEES) -> dict:
    """{culture: [verdict par année]} ; les saisons non jugeables (None) sont omises."""
    table = {}
    for c in cultures:
        verdicts = [verdict_saison(jours, lat, a, saison, c) for a in annees]
        table[c["nom"]] = [v for v in verdicts if v is not None]
    return table


def _serie(region: dict) -> dict:
    fichier = RAW / f"{region['id']}.json"
    if not fichier.exists():
        for essai in range(3):
            try:
                fichier.write_bytes(telecharger_serie(region["lat"], region["lon"]))
                break
            except Exception as e:  # noqa: BLE001 — réseau : on réessaie
                print(f"{region['id']} : {e}, nouvel essai", file=sys.stderr)
                time.sleep(5 * (essai + 1))
        else:
            raise RuntimeError(f"NASA POWER injoignable pour {region['id']}")
    return serie_depuis_power(json.loads(fichier.read_text("utf8")))


def main(argv: list[str]) -> int:
    regions = json.loads(REGIONS.read_text("utf8"))
    cultures = json.loads(CULTURES.read_text("utf8"))
    RAW.mkdir(parents=True, exist_ok=True)
    SORTIE.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(4) as pool:
        series = dict(zip([r["id"] for r in regions], pool.map(_serie, regions)))
    for r in regions:
        saison = json.loads((CLIMATS / f"{r['id']}.json").read_text("utf8"))["saisonPluies"]
        sortie = {
            "meta": {"region": r["id"], "source": "NASA POWER (journalier)", "periode": "2005–2025", "saison": saison, "reserveMm": RESERVE_MM},
            "cultures": table_region(series[r["id"]], r["lat"], saison, cultures),
        }
        (SORTIE / f"{r['id']}.json").write_text(json.dumps(sortie, ensure_ascii=False, separators=(",", ":")) + "\n", "utf8")
        m = sortie["cultures"]["Maïs"]
        print(f"{r['id']}: maïs {sum(v['verdict'] == 'bonne' for v in m)}/{len(m)} bonnes")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
