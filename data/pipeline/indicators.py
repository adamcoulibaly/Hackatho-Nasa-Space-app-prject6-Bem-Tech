"""Indicateurs climatiques calculés à partir de séries mensuelles (NASA POWER, etc.).

Fonctions pures, sans accès réseau : elles se testent seules (voir test_indicators.py).
"""
from __future__ import annotations

import calendar
import math
from typing import Mapping, Optional, Sequence

VALEUR_MANQUANTE = -999.0  # convention de la NASA POWER


def pluie_mm_mois(mm_par_jour: float, annee: int, mois: int) -> float:
    """Convertit une pluie moyenne en mm/jour en cumul du mois, en mm."""
    return mm_par_jour * calendar.monthrange(annee, mois)[1]


def climatologie(serie: Mapping[tuple[int, int], Optional[float]]) -> list[Optional[float]]:
    """Moyenne par mois (janvier à décembre) d'une série {(annee, mois): valeur}.

    Les valeurs manquantes (None ou -999) sont ignorées ; un mois sans aucune valeur donne None.
    """
    sommes = [0.0] * 12
    comptes = [0] * 12
    for (_, mois), v in serie.items():
        if v is None or v == VALEUR_MANQUANTE:
            continue
        sommes[mois - 1] += v
        comptes[mois - 1] += 1
    return [sommes[i] / comptes[i] if comptes[i] else None for i in range(12)]


def saison_des_pluies(pluie12: Sequence[float]) -> Optional[tuple[int, int]]:
    """Plus longue suite de mois dont la pluie dépasse la moyenne mensuelle (circulaire).

    Renvoie (mois de début, mois de fin), de 1 à 12 ; fin < début si la saison chevauche
    la fin d'année. None s'il ne pleut jamais.
    """
    total = sum(pluie12)
    if total <= 0:
        return None
    moyenne = total / 12
    pluvieux = [v >= moyenne for v in pluie12]
    if all(pluvieux):
        return (1, 12)
    # On part juste après un mois non pluvieux pour ne pas couper une suite en deux.
    depart = next(i for i in range(12) if not pluvieux[i]) + 1
    meilleure: tuple[int, int] = (0, 0)  # (longueur, debut index)
    i = 0
    while i < 12:
        idx = (depart + i) % 12
        if pluvieux[idx]:
            longueur = 0
            while i + longueur < 12 and pluvieux[(depart + i + longueur) % 12]:
                longueur += 1
            if longueur > meilleure[0]:
                meilleure = (longueur, idx)
            i += longueur
        else:
            i += 1
    longueur, debut = meilleure
    return (debut + 1, (debut + longueur - 1) % 12 + 1)


def saisons_des_pluies(pluie12: Sequence[float], part_min: float = 0.10) -> list[tuple[int, int]]:
    """Toutes les saisons des pluies : suites de mois au-dessus de la moyenne mensuelle (circulaire),
    gardées si elles apportent au moins `part_min` de la pluie de l'année. Triées par mois de début.

    Le nord ivoirien a une saison, le sud en a souvent deux.
    """
    total = sum(pluie12)
    if total <= 0:
        return []
    moyenne = total / 12
    pluvieux = [v >= moyenne for v in pluie12]
    if all(pluvieux):
        return [(1, 12)]
    depart = next(i for i in range(12) if not pluvieux[i]) + 1
    saisons: list[tuple[int, int]] = []
    i = 0
    while i < 12:
        idx = (depart + i) % 12
        if pluvieux[idx]:
            longueur = 0
            while i + longueur < 12 and pluvieux[(depart + i + longueur) % 12]:
                longueur += 1
            mois = [(idx + k) % 12 for k in range(longueur)]
            if sum(pluie12[m] for m in mois) >= part_min * total:
                saisons.append((idx + 1, (idx + longueur - 1) % 12 + 1))
            i += longueur
        else:
            i += 1
    return sorted(saisons)


def mann_kendall(serie: Sequence[float]) -> dict:
    """Test de tendance de Mann-Kendall (seuil bilatéral à 5 %, sans correction des ex aequo)."""
    n = len(serie)
    if n < 8:
        return {"s": 0, "z": 0.0, "tendance": "aucune"}
    s = 0
    for i in range(n - 1):
        for j in range(i + 1, n):
            s += (serie[j] > serie[i]) - (serie[j] < serie[i])
    variance = n * (n - 1) * (2 * n + 5) / 18
    if s > 0:
        z = (s - 1) / math.sqrt(variance)
    elif s < 0:
        z = (s + 1) / math.sqrt(variance)
    else:
        z = 0.0
    tendance = "hausse" if z > 1.96 else "baisse" if z < -1.96 else "aucune"
    return {"s": s, "z": z, "tendance": tendance}


def niveau(valeur: float, minimum: float, maximum: float) -> int:
    """Ramène une valeur sur l'échelle 0 à 4 des cases colorées."""
    if maximum == minimum:
        return 0
    return int(round((valeur - minimum) / (maximum - minimum) * 4))
