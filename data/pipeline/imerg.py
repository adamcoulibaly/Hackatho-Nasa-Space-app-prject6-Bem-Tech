"""Pluie GPM IMERG mensuelle (GES DISC, produit GPM_3IMERGM V07, grille 0,1°) et recoupement avec NASA POWER.

IMERG fusionne les mesures des satellites de la constellation GPM : c'est une pluie mesurée depuis l'espace,
indépendante de la réanalyse utilisée par NASA POWER. Les deux sources sont comparées sur la même finesse
(moyenne d'un carré de 0,5° autour du chef-lieu, la maille de POWER).
"""
from __future__ import annotations

import calendar
import math
import re
from typing import Iterable, Optional

URL = ("https://gpm1.gesdisc.eosdis.nasa.gov/opendap/GPM_L3/GPM_3IMERGM.07/{a}/"
       "3B-MO.MS.MRG.3IMERG.{a}{m:02d}01-S000000-E235959.{m:02d}.V07B.HDF5.ascii?precipitation[0][{x0}:{x1}][{y0}:{y1}]")
PAS = 0.1  # degré
DEMI = 2  # 5 × 5 pixels de 0,1° : un carré de 0,5° autour du point


def indice_lon(lon: float) -> int:
    """Colonne IMERG (centres de -179,95 à 179,95)."""
    return min(3599, max(0, math.floor((lon + 180) / PAS)))


def indice_lat(lat: float) -> int:
    """Ligne IMERG (centres de -89,95 à 89,95)."""
    return min(1799, max(0, math.floor((lat + 90) / PAS)))


def fenetre(points: Iterable[tuple[float, float]]) -> tuple[int, int, int, int]:
    """Plus petit sous-ensemble de la grille (x0, x1, y0, y1) qui contient le carré de chaque point."""
    pts = list(points)
    xs = [indice_lon(lon) for _, lon in pts]
    ys = [indice_lat(lat) for lat, _ in pts]
    return min(xs) - DEMI, max(xs) + DEMI, min(ys) - DEMI, max(ys) + DEMI


def lire_ascii(texte: str) -> list[list[Optional[float]]]:
    """Réponse ASCII d'OPeNDAP → grille[colonne][ligne] en mm/h (valeurs négatives = manquantes)."""
    grille: list[list[Optional[float]]] = []
    for ligne in texte.splitlines():
        m = re.match(r"^precipitation\[0\]\[(\d+)\],\s*(.*)$", ligne.strip())
        if not m:
            continue
        valeurs = [float(v) for v in m.group(2).split(",") if v.strip()]
        grille.append([v if v >= 0 else None for v in valeurs])
    return grille


def pluie_au_point(grille: list[list[Optional[float]]], x0: int, y0: int, lat: float, lon: float) -> Optional[float]:
    """Moyenne (mm/h) du carré de 0,5° centré sur le point ; None si plus de la moitié manque."""
    cx, cy = indice_lon(lon) - x0, indice_lat(lat) - y0
    vals = [grille[x][y] for x in range(cx - DEMI, cx + DEMI + 1) for y in range(cy - DEMI, cy + DEMI + 1)
            if 0 <= x < len(grille) and 0 <= y < len(grille[x])]
    ok = [v for v in vals if v is not None]
    return sum(ok) / len(ok) if ok and len(ok) * 2 >= len(vals) else None


def mm_par_mois(mm_h: float, annee: int, mois: int) -> float:
    return mm_h * 24 * calendar.monthrange(annee, mois)[1]


def correlation(a: list[float], b: list[float]) -> Optional[float]:
    n = len(a)
    if n < 3:
        return None
    ma, mb = sum(a) / n, sum(b) / n
    sa = math.sqrt(sum((x - ma) ** 2 for x in a))
    sb = math.sqrt(sum((y - mb) ** 2 for y in b))
    if sa == 0 or sb == 0:
        return None
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb)


def recoupement(imerg: dict[str, Optional[float]], power: dict[tuple[int, int], Optional[float]]) -> Optional[dict]:
    """Compare la pluie IMERG ({"AAAAMM": mm}) à la pluie POWER ({(année, mois): mm}) sur les mois communs.

    Renvoie la normale mensuelle IMERG, les totaux annuels moyens des deux sources, leur écart et la corrélation
    mois par mois. None si moins de 24 mois communs.
    """
    communs = sorted(k for k, v in imerg.items() if v is not None and power.get((int(k[:4]), int(k[4:]))) is not None)
    if len(communs) < 24:
        return None
    serie_i = [imerg[k] for k in communs]
    serie_p = [power[(int(k[:4]), int(k[4:]))] for k in communs]
    par_mois_i: dict[int, list[float]] = {m: [] for m in range(1, 13)}
    par_mois_p: dict[int, list[float]] = {m: [] for m in range(1, 13)}
    for k, vi, vp in zip(communs, serie_i, serie_p):
        par_mois_i[int(k[4:])].append(vi)  # type: ignore[arg-type]
        par_mois_p[int(k[4:])].append(vp)  # type: ignore[arg-type]
    normale_i = [round(sum(v) / len(v)) if v else 0 for v in par_mois_i.values()]
    normale_p = [round(sum(v) / len(v)) if v else 0 for v in par_mois_p.values()]
    annuel_i, annuel_p = sum(normale_i), sum(normale_p)
    ecart = round((annuel_i - annuel_p) / annuel_p * 100) if annuel_p else 0
    r = correlation(serie_i, serie_p)  # type: ignore[arg-type]
    accord = "bon" if r is not None and r >= 0.85 and abs(ecart) <= 15 else "moyen" if r is not None and r >= 0.7 and abs(ecart) <= 30 else "faible"
    return {
        "pluieMensuelle": normale_i,
        "pluieMensuellePower": normale_p,
        "annuel": annuel_i,
        "annuelPower": annuel_p,
        "ecartPct": ecart,
        "correlation": round(r, 2) if r is not None else None,
        "accord": accord,
        "mois": len(communs),
        "periode": f"{communs[0][:4]}–{communs[-1][:4]}",
        "source": "GPM IMERG V07 mensuel (NASA GES DISC), carré de 0,5° autour du chef-lieu",
    }
