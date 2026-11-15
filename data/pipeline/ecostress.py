"""ECOSTRESS (station spatiale internationale, pixels de 70 m) : température de surface et évapotranspiration
au-dessus des champs de chaque région.

Les mesures sont lues en 8 points de campagne, sur un cercle de 12 km autour du chef-lieu (la ville est plus chaude
que les champs) ; seuls les passages de jour et les pixels sans nuage ni eau comptent. ECOSTRESS ne passe pas
tous les jours et les nuages masquent souvent le sol en saison des pluies : la couverture est partielle, et le
nombre de passages utiles est toujours donné avec la mesure.
"""
from __future__ import annotations

import math
import statistics
from typing import Iterable, Optional

RAYON_KM = 12.0
NB_POINTS = 8
MIN_POINTS = 3  # points clairs nécessaires pour retenir un passage
HEURES_JOUR = range(9, 17)  # heure UTC = heure locale en Côte d'Ivoire
SEUIL_CHAUD = 40.0  # °C : au-delà, la surface brûle les jeunes plants et assèche le sol


def anneau(lat: float, lon: float, rayon_km: float = RAYON_KM, n: int = NB_POINTS) -> list[tuple[float, float]]:
    """n points régulièrement espacés sur un cercle de rayon_km autour du point."""
    dlat = rayon_km / 111.32
    dlon = rayon_km / (111.32 * math.cos(math.radians(lat)))
    return [(lat + dlat * math.sin(2 * math.pi * k / n), lon + dlon * math.cos(2 * math.pi * k / n)) for k in range(n)]


def de_jour(heure_iso: str) -> bool:
    """Passage de jour (heure UTC de début d'acquisition, ex. « 2023-01-04T09:00:38.698Z »)."""
    return int(heure_iso[11:13]) in HEURES_JOUR


def kelvin_vers_celsius(k: float) -> float:
    return k - 273.15


def valeur_passage(valeurs: Iterable[Optional[float]]) -> Optional[float]:
    """Médiane des points clairs d'un passage ; None si moins de MIN_POINTS."""
    ok = [v for v in valeurs if v is not None and math.isfinite(v)]
    return statistics.median(ok) if len(ok) >= MIN_POINTS else None


def resume(passages_lst: dict[str, float], passages_et: dict[str, float], periode: str) -> Optional[dict]:
    """Passages {heure ISO: valeur} → moyennes mensuelles (None si aucun passage ce mois-là), part des jours chauds."""
    if not passages_lst and not passages_et:
        return None

    def par_mois(p: dict[str, float], decimales: int) -> list[Optional[float]]:
        mois: dict[int, list[float]] = {m: [] for m in range(1, 13)}
        for h, v in p.items():
            mois[int(h[5:7])].append(v)
        return [round(sum(v) / len(v), decimales) if v else None for v in mois.values()]

    chauds = [v for v in passages_lst.values() if v >= SEUIL_CHAUD]
    return {
        "lst": par_mois(passages_lst, 1),
        "et": par_mois(passages_et, 2),
        "passages": len(passages_lst),
        "joursChauds": round(len(chauds) / len(passages_lst), 2) if passages_lst else None,
        "seuil": SEUIL_CHAUD,
        "periode": periode,
        "source": "ECOSTRESS V002 (NASA LP DAAC) : température de surface ECO_L2T_LSTE et évapotranspiration journalière ECO_L3T_JET, 70 m",
        "point": f"{NB_POINTS} points de campagne à {RAYON_KM:.0f} km du chef-lieu",
    }
