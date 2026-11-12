"""Projections 2050 : part des bonnes saisons par culture, référence 1995–2014 et futur 2041–2060.

Pour chaque modèle (IPSL-CM6A-LR, MRI-ESM2-0, GFDL-ESM4), scénario (SSP2-4.5, SSP5-8.5), variable (pr, tasmax, tasmin)
et année, télécharge la boîte de la Côte d'Ivoire (NCCS THREDDS), garde les séries des 33 chefs-lieux dans
data/raw/cmip6/ (reprise possible), puis rejoue chaque saison avec saison.verdict_saison et écrit data/projections/<id>.json.
Usage : python3 build_projections.py
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from cmip6 import ANNEES_FUTURES, FUTUR, HORIZONS, MODELES, REFERENCE, SCENARIOS, VARIABLES, aligner_annee, lire_points, lister_s3, nom_fichier, part_bonnes, scenario_de, url_ncss
from saison import verdict_saison

ICI = Path(__file__).resolve().parent
RACINE = ICI.parent.parent
REGIONS = json.loads((RACINE / "frontend" / "src" / "lib" / "regions.json").read_text("utf8"))
CULTURES = json.loads((RACINE / "knowledge" / "cultures.json").read_text("utf8"))
CLIMATS = ICI.parent / "regions"
RAW = ICI.parent / "raw" / "cmip6"
SORTIE = ICI.parent / "projections"
POINTS = {r["id"]: (r["lat"], r["lon"]) for r in REGIONS}


def lire(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "forosat-hackathon"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


_listes: dict[str, list[str]] = {}


def lister(prefixe: str) -> list[str]:
    if prefixe not in _listes:
        _listes[prefixe] = lister_s3(prefixe, lire)
    return _listes[prefixe]


def telecharger(tache: tuple[str, str, str, int]) -> None:
    modele, scenario, variable, annee = tache
    fichier = RAW / f"{modele}_{scenario}_{variable}_{annee}.json"
    if fichier.exists():
        return
    chemin = nom_fichier(modele, scenario, variable, annee, lister)
    for essai in range(3):
        try:
            series = lire_points(lire(url_ncss(chemin, variable)), variable, POINTS)
            fichier.write_text(json.dumps({k: aligner_annee(v, annee) for k, v in series.items()}), "utf8")
            return
        except Exception as e:  # noqa: BLE001 — réseau : on réessaie
            print(f"{tache} : {e}", file=sys.stderr)
            time.sleep(10 * (essai + 1))
    raise RuntimeError(f"échec {tache}")


def taches() -> list[tuple[str, str, str, int]]:
    t = []
    for m in MODELES:
        for v in VARIABLES:
            t += [(m, "historical", v, a) for a in REFERENCE]
            t += [(m, s, v, a) for s in SCENARIOS for a in ANNEES_FUTURES]
    return t


def serie(modele: str, scenario: str, annees: range, region: str) -> dict:
    """Série journalière continue d'une région sur une période, au format attendu par verdict_saison."""
    jours: dict[str, list] = {"pluie": [], "tmax": [], "tmin": []}
    for a in annees:
        for var, cle in (("pr", "pluie"), ("tasmax", "tmax"), ("tasmin", "tmin")):
            donnees = json.loads((RAW / f"{modele}_{scenario_de(a, scenario)}_{var}_{a}.json").read_text("utf8"))
            jours[cle] += donnees[region]
    return {"debut": f"{annees[0]}-01-01", **jours}


def main(argv: list[str]) -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    SORTIE.mkdir(parents=True, exist_ok=True)
    liste = taches()
    with ThreadPoolExecutor(6) as pool:
        for i, _ in enumerate(pool.map(telecharger, liste), 1):
            if i % 30 == 0:
                print(f"{i}/{len(liste)} fichiers", flush=True)
    for r in REGIONS:
        saison = json.loads((CLIMATS / f"{r['id']}.json").read_text("utf8"))["saisonPluies"]
        cultures: dict = {c["nom"]: {s: {} for s in SCENARIOS} for c in CULTURES}
        for m in MODELES:
            ref = serie(m, "historical", REFERENCE, r["id"])
            vr_par_culture = {c["nom"]: [v for a in REFERENCE if (v := verdict_saison(ref, r["lat"], a, saison, c))] for c in CULTURES}
            for s in SCENARIOS:
                fut = serie(m, s, ANNEES_FUTURES, r["id"])
                for c in CULTURES:
                    parts = {"reference": part_bonnes(vr_par_culture[c["nom"]])}
                    for h, annees in HORIZONS.items():
                        vf = [v for a in annees if (v := verdict_saison(fut, r["lat"], a, saison, c))]
                        parts["futur" if h == "2050" else f"futur{h}"] = part_bonnes(vf)
                    cultures[c["nom"]][s][m] = parts
        sortie = {
            "meta": {
                "region": r["id"], "source": "NASA NEX-GDDP-CMIP6 v2.0 (NCCS)", "modeles": MODELES, "scenarios": SCENARIOS,
                "reference": "1995–2014", "futur": "2041–2060", "horizons": {h: f"{a.start}–{a.stop - 1}" for h, a in HORIZONS.items()},
            },
            "cultures": cultures,
        }
        (SORTIE / f"{r['id']}.json").write_text(json.dumps(sortie, ensure_ascii=False, separators=(",", ":")) + "\n", "utf8")
        mais = cultures["Maïs"]["ssp585"]
        print(r["id"], "maïs ssp585", {m: mais[m] for m in MODELES})
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
