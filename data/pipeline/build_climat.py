"""Met à jour data/pilot/korhogo/climat.json avec les vraies données NASA POWER.

Remplace : pluie mensuelle, saison des pluies, chaleur, trois indicateurs, les lignes Pluie et
Chaleur de la matrice, et les onglets pluie et chaleur. Le reste (sol, végétation, GRACE, alertes,
état du moment) reste en valeurs d'exemple jusqu'à l'arrivée de leurs sources.

Usage : python3 build_climat.py        (après fetch_power.py)
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from indicators import climatologie, mann_kendall, niveau, pluie_mm_mois, saison_des_pluies

ICI = Path(__file__).resolve().parent
RAW = ICI.parent / "raw" / "power_korhogo_monthly.json"
CLIMAT = ICI.parent / "pilot" / "korhogo" / "climat.json"

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
MOIS_COURT = ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"]


def lire_serie(brut: dict, nom: str) -> dict[tuple[int, int], float]:
    """{(annee, mois): valeur} sans les cumuls annuels (mois 13)."""
    serie = {}
    for cle, v in brut["properties"]["parameter"][nom].items():
        annee, mois = int(cle[:4]), int(cle[4:])
        if mois <= 12:
            serie[(annee, mois)] = v
    return serie


def main() -> int:
    brut = json.loads(RAW.read_text(encoding="utf-8"))
    pluie_jour = lire_serie(brut, "PRECTOTCORR")
    tmax = lire_serie(brut, "T2M_MAX")

    pluie_mois = {k: (pluie_mm_mois(v, *k) if v != -999.0 else None) for k, v in pluie_jour.items()}
    pluie12 = [round(v) for v in climatologie(pluie_mois)]  # type: ignore[arg-type]
    chaleur12 = [round(v, 1) for v in climatologie(tmax)]  # type: ignore[arg-type]

    saison = saison_des_pluies(pluie12)
    if saison is None or saison[0] > saison[1]:
        print(f"Saison des pluies {saison} : l'interface ne sait pas encore dessiner une saison à cheval sur deux années.", file=sys.stderr)
        return 1

    annees = sorted({a for a, _ in pluie_mois})
    totaux = []
    for a in annees:
        mois_a = [pluie_mois.get((a, m)) for m in range(1, 13)]
        if all(v is not None for v in mois_a):
            totaux.append(sum(mois_a))  # type: ignore[arg-type]
    tendance = mann_kendall(totaux)

    i_pluie = pluie12.index(max(pluie12))
    i_chaud = chaleur12.index(max(chaleur12))
    total_annuel = sum(pluie12)
    t_min, t_max = min(chaleur12), max(chaleur12)

    c = json.loads(CLIMAT.read_text(encoding="utf-8"))
    c["pluieMensuelle"] = pluie12
    c["saisonPluies"] = {"debut": saison[0], "fin": saison[1]}
    ind = c["indicateurs"]
    ind[0] = {"label": "Saison des pluies", "valeur": f"{MOIS_COURT[saison[0] - 1]} → {MOIS_COURT[saison[1] - 1]}", "source": "Une seule saison · NASA POWER"}
    ind[1] = {"label": "Pluie annuelle moyenne", "valeur": f"{total_annuel:,} mm".replace(",", " "), "source": "NASA POWER"}
    ind[2] = {"label": "Mois le plus chaud", "valeur": f"{MOIS[i_chaud].capitalize()} · {chaleur12[i_chaud]:.0f} °C", "source": "Température max. · NASA POWER", "accent": True}

    for ligne in c["matrice"]:
        if ligne["label"] == "Pluie":
            ligne["source"] = "NASA POWER"
            ligne["valeurs"] = [niveau(v, 0, max(pluie12)) for v in pluie12]
        elif ligne["label"] == "Chaleur":
            ligne["source"] = "NASA POWER"
            ligne["valeurs"] = [niveau(v, t_min, t_max) for v in chaleur12]

    for o in c["onglets"]:
        if o["id"] == "pluie":
            o["valeurs"] = pluie12
            o["source"] = "NASA POWER"
            o["big"] = f"{pluie12[i_pluie]} mm en {MOIS[i_pluie]}"
        elif o["id"] == "chaleur":
            o["valeurs"] = chaleur12
            o["source"] = "NASA POWER"
            o["min"] = math.floor(t_min) - 2
            o["big"] = f"{chaleur12[i_chaud]:.0f} °C en {MOIS[i_chaud]}"

    phrase = {"hausse": "en hausse", "baisse": "en baisse", "aucune": "sans tendance nette"}[tendance["tendance"]]
    c["meta"] = {
        "reel": ["pluie", "chaleur"],
        "source": "NASA POWER (MERRA-2 / IMERG), point 9,46 N · 5,63 O",
        "periode": f"{annees[0]}–{annees[-1]}",
        "tendancePluie": f"Pluie annuelle {phrase} sur la période (test de Mann-Kendall, z = {tendance['z']:.2f}, {len(totaux)} années).",
    }
    CLIMAT.write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("pluie mensuelle :", pluie12)
    print("chaleur mensuelle :", chaleur12)
    print("saison :", saison, "· total annuel :", total_annuel, "mm")
    print("tendance :", tendance)
    return 0


if __name__ == "__main__":
    sys.exit(main())
