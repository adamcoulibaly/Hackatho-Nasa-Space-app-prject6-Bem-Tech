"""État du moment : les 30 derniers jours publiés par NASA POWER, comparés à la normale du mois."""
from __future__ import annotations

import calendar
from datetime import date
from typing import Optional

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
MANQUANT = -999.0
JOURS_MIN = 20


def _date(cle: str) -> date:
    return date(int(cle[:4]), int(cle[4:6]), int(cle[6:8]))


def _texte_date(d: date) -> str:
    return f"{d.day} {MOIS[d.month - 1]}"


def etat_du_moment(brut_jours: dict, normales: dict, saisons: list[tuple[int, int]], aujourd_hui: date) -> Optional[dict]:
    """Tuiles pluie, chaleur et humidité du sol des 30 derniers jours publiés, ou None s'il y a moins de 20 jours valides."""
    p = brut_jours["properties"]["parameter"]
    cles = sorted(p["PRECTOTCORR"])[-30:]
    valides = [k for k in cles if all(p[n][k] != MANQUANT for n in ("PRECTOTCORR", "T2M_MAX", "GWETROOT"))]
    if len(valides) < JOURS_MIN:
        return None
    d1, d2 = _date(valides[0]), _date(valides[-1])
    jours = [_date(k) for k in valides]
    pluie = sum(p["PRECTOTCORR"][k] for k in valides)
    chaleur = sum(p["T2M_MAX"][k] for k in valides) / len(valides)
    sol = sum(p["GWETROOT"][k] for k in valides) / len(valides)
    # Normale de chaque jour selon son propre mois : une fenêtre à cheval sur deux mois reste juste.
    pluie_normale = sum(normales["pluie"][d.month - 1] / calendar.monthrange(d.year, d.month)[1] for d in jours)
    n_chaleur = sum(normales["chaleur"][d.month - 1] for d in jours) / len(jours)
    n_sol = sum(normales["sol"][d.month - 1] for d in jours) / len(jours)

    def niv_pluie() -> str:
        return "alerte" if pluie < 0.5 * pluie_normale else "ok" if pluie >= 0.9 * pluie_normale else "neutre"

    def niv_chaleur() -> str:
        return "alerte" if chaleur > n_chaleur + 2 else "ok" if chaleur <= n_chaleur else "neutre"

    def niv_sol() -> str:
        return "alerte" if sol < n_sol - 0.05 else "ok" if sol >= n_sol else "neutre"

    mois = aujourd_hui.month
    en_cours = next((s for s in saisons if s[0] <= mois <= s[1]), None)
    if en_cours:
        saison, titre, accent = "Saison des pluies", "Saison des pluies jusqu'en", MOIS[en_cours[1] - 1]
    else:
        prochaine = min(saisons, key=lambda s: (s[0] - mois) % 12) if saisons else None
        saison, titre, accent = "Saison sèche", "Prochaines pluies vers", MOIS[prochaine[0] - 1] if prochaine else "—"

    return {
        "saison": saison,
        "titre": titre,
        "accent": accent,
        "texte": f"Mesures NASA POWER du {_texte_date(d1)} au {_texte_date(d2)} ({len(valides)} jours).",
        "moisCourant": mois,
        "dateFin": d2.isoformat(),
        "tuiles": [
            {"label": "Pluie (30 j)", "valeur": f"{pluie:.0f} mm", "source": f"Normale ≈ {pluie_normale:.0f} mm · NASA POWER", "niveau": niv_pluie()},
            {"label": "Chaleur", "valeur": f"{chaleur:.0f} °C", "source": f"Normale {n_chaleur:.0f} °C · NASA POWER", "niveau": niv_chaleur()},
            {"label": "Humidité du sol", "valeur": f"{sol:.2f}".replace(".", ","), "source": f"Normale {n_sol:.2f} · NASA POWER".replace(".", ",", 1), "niveau": niv_sol()},
        ],
        "extras": [],
    }
