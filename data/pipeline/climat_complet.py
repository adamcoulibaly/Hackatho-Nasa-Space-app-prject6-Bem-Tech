"""Climat complet et entièrement réel d'une région (NASA POWER), au format de climat.json.

Pluie, chaleur et humidité du sol mensuelles (2005–2025), saisons des pluies, alertes et état du moment.
La végétation (NDVI) et l'eau stockée (GRACE) ne sont pas incluses tant que le compte Earthdata n'est pas branché.
"""
from __future__ import annotations

import math
from datetime import date
from typing import Optional

from etat_du_moment import etat_du_moment
from grace_gibs import ecarts_annuels
from indicators import climatologie, mann_kendall, niveau, pluie_mm_mois, saisons_des_pluies

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
MOIS_COURT = ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"]
SOURCE_SOL = "NASA POWER (MERRA-2)"


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


def _virgule(x: float) -> str:
    return f"{x:.2f}".replace(".", ",")


def alertes(pluie12: list, chaleur12: list, sol12: list, saisons: list[tuple[int, int]]) -> list[dict]:
    """Alertes tirées des normales de la région, par règles écrites."""
    a = []
    i_chaud = chaleur12.index(max(chaleur12))
    if chaleur12[i_chaud] >= 38:
        a.append({"type": "surveiller", "titre": f"Forte chaleur en {MOIS[i_chaud]}", "texte": f"La température maximale atteint {chaleur12[i_chaud]:.0f} °C en moyenne en {MOIS[i_chaud]} : un sol nu y sèche très vite."})
    i_sec = sol12.index(min(sol12))
    a.append({"type": "surveiller", "titre": f"Sol très sec en {MOIS[i_sec]}", "texte": f"C'est le mois où le sol est le plus sec (indice {_virgule(sol12[i_sec])}) : évitez de semer à ce moment."})
    i_hum = sol12.index(max(sol12))
    a.append({"type": "favorable", "titre": f"Fenêtre humide : {MOIS[i_hum]}", "texte": "Le sol est le plus humide : bonne période pour une légumineuse ou une culture de couverture."})
    if len(saisons) >= 2:
        a.append({"type": "favorable", "titre": "Deux saisons des pluies", "texte": "Une grande et une petite saison : deux cycles courts peuvent tenir dans l'année."})
    return a


def climat_complet(brut_mensuel: dict, brut_jours: Optional[dict], region: dict, aujourd_hui: date, ndvi: Optional[dict] = None, grace: Optional[dict] = None) -> dict:
    """ndvi et grace : {"AAAAMM": valeur ou None} lus dans NASA GIBS, facultatifs."""
    pluie_jour = lire_serie(brut_mensuel, "PRECTOTCORR")
    pluie_mois = {k: (pluie_mm_mois(v, *k) if v != -999.0 else None) for k, v in pluie_jour.items()}
    pluie12 = [round(v) for v in climatologie(pluie_mois)]  # type: ignore[arg-type]
    chaleur12 = [round(v, 1) for v in climatologie(lire_serie(brut_mensuel, "T2M_MAX"))]  # type: ignore[arg-type]
    sol12 = [round(v, 2) for v in climatologie(lire_serie(brut_mensuel, "GWETROOT"))]  # type: ignore[arg-type]

    saisons = [s for s in saisons_des_pluies(pluie12) if s[0] <= s[1]] or [(1, 12)]
    principale = max(saisons, key=lambda s: sum(pluie12[m - 1] for m in range(s[0], s[1] + 1)))
    annees = sorted({a for a, _ in pluie_mois})
    totaux = [sum(pluie_mois[(a, m)] for m in range(1, 13)) for a in annees if all(pluie_mois.get((a, m)) is not None for m in range(1, 13))]  # type: ignore[misc]
    tendance = mann_kendall(totaux)
    i_pluie, i_chaud = pluie12.index(max(pluie12)), chaleur12.index(max(chaleur12))
    i_sec, i_hum = sol12.index(min(sol12)), sol12.index(max(sol12))
    t_min, t_max = min(chaleur12), max(chaleur12)
    nb = "Une seule saison" if len(saisons) == 1 else f"{len(saisons)} saisons"
    phrase = {"hausse": "en hausse", "baisse": "en baisse", "aucune": "sans tendance nette"}[tendance["tendance"]]

    c = {
        "indicateurs": [
            {"label": "Saison des pluies", "valeur": libelle_saisons(saisons), "source": f"{nb} · NASA POWER"},
            {"label": "Pluie annuelle moyenne", "valeur": f"{sum(pluie12):,} mm".replace(",", " "), "source": "NASA POWER"},
            {"label": "Mois le plus chaud", "valeur": f"{MOIS[i_chaud].capitalize()} · {chaleur12[i_chaud]:.0f} °C", "source": "Température max. · NASA POWER", "accent": True},
            {"label": "Sol le plus sec", "valeur": f"{MOIS[i_sec].capitalize()} · {_virgule(sol12[i_sec])}", "source": f"Humidité du sol (0 à 1) · {SOURCE_SOL}"},
        ],
        "pluieMensuelle": pluie12,
        "saisonPluies": {"debut": principale[0], "fin": principale[1]},
        "saisons": [{"debut": d, "fin": f} for d, f in saisons],
        "matrice": [
            {"label": "Pluie", "source": "NASA POWER", "palette": "eau", "valeurs": [niveau(v, 0, max(pluie12)) for v in pluie12]},
            {"label": "Chaleur", "source": "NASA POWER", "palette": "chaud", "valeurs": [niveau(v, t_min, t_max) for v in chaleur12]},
            {"label": "Humidité du sol", "source": SOURCE_SOL, "palette": "eau", "valeurs": [niveau(v, min(sol12), max(sol12)) for v in sol12]},
        ],
        "alertes": alertes(pluie12, chaleur12, sol12, saisons),
        "onglets": [
            {"id": "pluie", "label": "Pluie", "big": f"{pluie12[i_pluie]} mm en {MOIS[i_pluie]}", "source": "NASA POWER", "legende": "Pluie moyenne par mois", "valeurs": pluie12, "saison": True,
             "conseil": f"La pluie tombe surtout de {MOIS[principale[0] - 1]} à {MOIS[principale[1] - 1]} : c'est la fenêtre pour les cultures pluviales." if len(saisons) == 1 else "Deux saisons des pluies : une grande et une petite. Deux cultures courtes peuvent parfois tenir dans l'année."},
            {"id": "chaleur", "label": "Chaleur", "big": f"{chaleur12[i_chaud]:.0f} °C en {MOIS[i_chaud]}", "source": "NASA POWER", "legende": "Température maximale moyenne", "valeurs": chaleur12, "min": math.floor(t_min) - 2,
             "conseil": f"C'est en {MOIS[i_chaud]} qu'il fait le plus chaud : un sol couvert garde mieux son humidité."},
            {"id": "sol", "label": "Sol", "big": f"Humide en {MOIS[i_hum]}", "source": SOURCE_SOL, "legende": "Humidité de la zone racinaire (indice 0 à 1)", "valeurs": sol12, "min": max(0.0, round(min(sol12) - 0.05, 2)),
             "conseil": f"Le sol est le plus humide en {MOIS[i_hum]} et le plus sec en {MOIS[i_sec]} : semez quand l'humidité remonte, au début de la saison des pluies."},
        ],
        "meta": {
            "reel": ["pluie", "chaleur", "humidité du sol"],
            "region": region["id"],
            "source": f"NASA POWER, {region['chefLieu']} ({_coord(region['lat'], 'N', 'S')} · {_coord(region['lon'], 'E', 'O')})",
            "periode": f"{annees[0]}–{annees[-1]}",
            "tendancePluie": f"Pluie annuelle {phrase} sur la période (test de Mann-Kendall, z = {tendance['z']:.2f}, {len(totaux)} années).",
        },
    }
    if ndvi:
        serie = {(int(k[:4]), int(k[4:])): v for k, v in ndvi.items()}
        clim = climatologie(serie)
        if all(v is not None for v in clim):
            ndvi12 = [round(v, 2) for v in clim]  # type: ignore[arg-type]
            i_bas, i_haut = ndvi12.index(min(ndvi12)), ndvi12.index(max(ndvi12))
            n_mois = sum(1 for v in serie.values() if v is not None)
            c["matrice"].append({"label": "Végétation", "source": "MODIS Terra (NASA GIBS)", "palette": "veg", "valeurs": [niveau(v, min(ndvi12), max(ndvi12)) for v in ndvi12]})
            c["onglets"].append({
                "id": "veg", "label": "Végét.", "big": f"Pic en {MOIS[i_haut]}", "source": "MODIS Terra (NASA GIBS)",
                "legende": "Indice de végétation NDVI (0 à 1)", "valeurs": ndvi12, "min": max(0.0, round(min(ndvi12) - 0.05, 2)),
                "conseil": f"La végétation est la plus faible en {MOIS[i_bas]} : c'est là que le sol nu s'abîme le plus. Une culture de couverture le protège.",
            })
            c["indicateurs"].append({"label": "Végétation au plus bas", "valeur": f"{MOIS[i_bas].capitalize()} · {_virgule(ndvi12[i_bas])}", "source": f"NDVI MODIS · NASA GIBS ({n_mois} mois)"})
            c["meta"]["reel"].append("végétation")
    if grace:
        mesures = [k for k, v in grace.items() if v is not None]
        if mesures:
            fin = int(max(mesures)[:4])
            c["grace"] = ecarts_annuels(grace, 2005, fin)
            c["meta"]["reel"].append("eau stockée")
    if brut_jours:
        actuel = etat_du_moment(brut_jours, {"pluie": pluie12, "chaleur": chaleur12, "sol": sol12}, saisons, aujourd_hui)
        if actuel:
            c["actuel"] = actuel
    return c
