"""Eau stockée GRACE / GRACE-FO (JPL mascon CRI), lue dans les tuiles NASA GIBS, sans compte.

Valeur en cm d'équivalent eau, écart à la moyenne de référence de la mission. Le pixel du chef-lieu
suffit : la mesure GRACE couvre plusieurs centaines de km.
"""
from __future__ import annotations

from datetime import date
from typing import Optional

COUCHE = "GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI"
ZOOM = 6
URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{couche}/default/{date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png"
MOIS_MIN_PAR_AN = 6


def dates_par_mois(valeurs: list[str]) -> dict[str, str]:
    """{"AAAAMM": date publiée} à partir des intervalles de temps GIBS (« début/fin/période »)."""
    out: dict[str, str] = {}
    for v in valeurs:
        debut_s, fin_s, periode = v.split("/")
        debut, fin = date.fromisoformat(debut_s), date.fromisoformat(fin_s)
        jours = [debut]
        if periode == "P1M" and fin > debut:
            a, m = debut.year, debut.month
            while True:
                m += 1
                if m > 12:
                    a, m = a + 1, 1
                d = date(a, m, debut.day)
                if d > fin:
                    break
                jours.append(d)
        for d in jours:
            out.setdefault(f"{d.year}{d.month:02d}", d.isoformat())
    return dict(sorted(out.items()))


def ecarts_annuels(serie: dict[str, Optional[float]], debut: int, fin: int) -> list[dict]:
    """Moyenne annuelle (cm, une décimale) ; None (lacune) quand moins de 6 mois sont mesurés."""
    out = []
    for a in range(debut, fin + 1):
        v = [x for k, x in serie.items() if k.startswith(str(a)) and x is not None]
        out.append({"annee": a, "ecart": round(sum(v) / len(v), 1) if len(v) >= MOIS_MIN_PAR_AN else None})
    return out
