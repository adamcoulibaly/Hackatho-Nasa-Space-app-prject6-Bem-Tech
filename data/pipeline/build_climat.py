"""Construit le climat réel (NASA POWER) d'une région à partir d'un modèle de climat.json.

Remplace : pluie mensuelle, saisons des pluies, chaleur, trois indicateurs, les lignes Pluie et
Chaleur de la matrice, et les onglets pluie et chaleur. Le reste (sol, végétation, GRACE, alertes,
état du moment) reste en valeurs d'exemple de Korhogo, et `meta.exempleDe` le dit.

Usage : python3 build_climat.py        (zone pilote de Korhogo, après fetch_power.py)
"""
from __future__ import annotations

import copy
import json
import math
import sys
from pathlib import Path

from indicators import climatologie, mann_kendall, niveau, pluie_mm_mois, saisons_des_pluies

ICI = Path(__file__).resolve().parent
RAW = ICI.parent / "raw" / "power_korhogo_monthly.json"
CLIMAT = ICI.parent / "pilot" / "korhogo" / "climat.json"
REGIONS = ICI.parent.parent / "frontend" / "src" / "lib" / "regions.json"

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


def libelle_saisons(saisons: list[tuple[int, int]]) -> str:
    """« Mars → Juin · Oct » : un mois seul s'écrit sans flèche."""
    return " · ".join(MOIS_COURT[d - 1] if d == f else f"{MOIS_COURT[d - 1]} → {MOIS_COURT[f - 1]}" for d, f in saisons)


def _coord(v: float, pos: str, neg: str) -> str:
    return f"{abs(v):.2f}".replace(".", ",") + f" {pos if v >= 0 else neg}"


def climat_reel(modele: dict, brut: dict, region: dict) -> dict:
    """Nouveau climat (le modèle n'est pas modifié) avec la pluie et la chaleur réelles de la région."""
    pluie_jour = lire_serie(brut, "PRECTOTCORR")
    tmax = lire_serie(brut, "T2M_MAX")
    pluie_mois = {k: (pluie_mm_mois(v, *k) if v != -999.0 else None) for k, v in pluie_jour.items()}
    pluie12 = [round(v) for v in climatologie(pluie_mois)]  # type: ignore[arg-type]
    chaleur12 = [round(v, 1) for v in climatologie(tmax)]  # type: ignore[arg-type]

    saisons = saisons_des_pluies(pluie12)
    # L'interface dessine des saisons qui ne chevauchent pas la fin d'année.
    saisons = [s for s in saisons if s[0] <= s[1]] or [(1, 12)]
    principale = max(saisons, key=lambda s: sum(pluie12[m - 1] for m in range(s[0], s[1] + 1)))

    annees = sorted({a for a, _ in pluie_mois})
    totaux = [sum(pluie_mois[(a, m)] for m in range(1, 13)) for a in annees if all(pluie_mois.get((a, m)) is not None for m in range(1, 13))]  # type: ignore[misc]
    tendance = mann_kendall(totaux)
    i_pluie = pluie12.index(max(pluie12))
    i_chaud = chaleur12.index(max(chaleur12))
    t_min, t_max = min(chaleur12), max(chaleur12)

    c = copy.deepcopy(modele)
    c["pluieMensuelle"] = pluie12
    c["saisons"] = [{"debut": d, "fin": f} for d, f in saisons]
    c["saisonPluies"] = {"debut": principale[0], "fin": principale[1]}
    nb = "Une seule saison" if len(saisons) == 1 else f"{len(saisons)} saisons"
    ind = c["indicateurs"]
    ind[0] = {"label": "Saison des pluies", "valeur": libelle_saisons(saisons), "source": f"{nb} · NASA POWER"}
    ind[1] = {"label": "Pluie annuelle moyenne", "valeur": f"{sum(pluie12):,} mm".replace(",", " "), "source": "NASA POWER"}
    ind[2] = {"label": "Mois le plus chaud", "valeur": f"{MOIS[i_chaud].capitalize()} · {chaleur12[i_chaud]:.0f} °C", "source": "Température max. · NASA POWER", "accent": True}
    if len(ind) > 3 and region["id"] != "poro":
        ind[3] = {**ind[3], "source": ind[3]["source"] + " · exemple Korhogo"}

    for ligne in c["matrice"]:
        if ligne["label"] == "Pluie":
            ligne["source"] = "NASA POWER"
            ligne["valeurs"] = [niveau(v, 0, max(pluie12)) for v in pluie12]
        elif ligne["label"] == "Chaleur":
            ligne["source"] = "NASA POWER"
            ligne["valeurs"] = [niveau(v, t_min, t_max) for v in chaleur12]

    for o in c["onglets"]:
        if o["id"] == "pluie":
            o.update(valeurs=pluie12, source="NASA POWER", big=f"{pluie12[i_pluie]} mm en {MOIS[i_pluie]}")
            o["conseil"] = (
                f"La pluie tombe surtout de {MOIS[principale[0] - 1]} à {MOIS[principale[1] - 1]} : c'est la fenêtre pour les cultures pluviales."
                if len(saisons) == 1
                else "Deux saisons des pluies : une grande et une petite. On peut parfois faire deux cultures dans l'année."
            )
        elif o["id"] == "chaleur":
            o.update(valeurs=chaleur12, source="NASA POWER", min=math.floor(t_min) - 2, big=f"{chaleur12[i_chaud]:.0f} °C en {MOIS[i_chaud]}")

    phrase = {"hausse": "en hausse", "baisse": "en baisse", "aucune": "sans tendance nette"}[tendance["tendance"]]
    c["meta"] = {
        "reel": ["pluie", "chaleur"],
        "region": region["id"],
        "source": f"NASA POWER, {region['chefLieu']} ({_coord(region['lat'], 'N', 'S')} · {_coord(region['lon'], 'E', 'O')})",
        "periode": f"{annees[0]}–{annees[-1]}",
        "tendancePluie": f"Pluie annuelle {phrase} sur la période (test de Mann-Kendall, z = {tendance['z']:.2f}, {len(totaux)} années).",
        "exempleDe": "Korhogo",
    }
    return c


def main() -> int:
    regions = {r["id"]: r for r in json.loads(REGIONS.read_text(encoding="utf-8"))}
    modele = json.loads(CLIMAT.read_text(encoding="utf-8"))
    c = climat_reel(modele, json.loads(RAW.read_text(encoding="utf-8")), regions["poro"])
    CLIMAT.write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Korhogo :", c["indicateurs"][0]["valeur"], "·", c["indicateurs"][1]["valeur"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
