"""Moteur de saison : date de semis, bilan d'eau FAO-56 et verdict d'une saison pour une culture.

- Semis (Sivakumar, 1988) : premier jour où le cumul sur 3 jours atteint 20 mm, sans 7 jours secs
  (< 1 mm/j) dans les 20 jours suivants, cherché du 1er jour du mois de début de la saison principale
  à la fin du 2e mois suivant.
- Évaporation de référence : Hargreaves (FAO-56, éq. 52), rayonnement extraterrestre (éq. 21).
- Bilan : réservoir de 100 mm d'eau utile (hypothèse : pas de mesure du sol de la parcelle),
  coefficient cultural par stade (FAO-56, tableaux 11 et 12), stress dès que l'épuisement dépasse 50 %.
- Verdict : rapport eau reçue / eau demandée, poids double pendant la floraison (mi-saison).
"""
from __future__ import annotations

import calendar
import math
from datetime import date, timedelta
from typing import Optional

SEUIL_CUMUL_MM = 20.0
JOURS_CUMUL = 3
JOUR_SEC_MM = 1.0
POCHE_SECHE_JOURS = 7
VERIF_JOURS = 20
RESERVE_MM = 100.0
FRACTION_P = 0.5
MANQUANT_MAX = 0.10


def ra_mm(lat: float, jour_annee: int) -> float:
    """Rayonnement extraterrestre, converti en mm d'eau évaporable par jour (× 0,408)."""
    phi = math.radians(lat)
    dr = 1 + 0.033 * math.cos(2 * math.pi * jour_annee / 365)
    delta = 0.409 * math.sin(2 * math.pi * jour_annee / 365 - 1.39)
    ws = math.acos(max(-1.0, min(1.0, -math.tan(phi) * math.tan(delta))))
    ra = 24 * 60 / math.pi * 0.0820 * dr * (ws * math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.sin(ws))
    return ra * 0.408


def et0_hargreaves(tmax: float, tmin: float, ra: float) -> float:
    """ET0 (mm/j) de Hargreaves, ra en mm/j."""
    return 0.0023 * ra * ((tmax + tmin) / 2 + 17.8) * math.sqrt(max(0.0, tmax - tmin))


def _sec(v: Optional[float]) -> bool:
    return v is None or v < JOUR_SEC_MM


def _plus_longue_poche(pluie: list[Optional[float]]) -> int:
    meilleur = courant = 0
    for v in pluie:
        courant = courant + 1 if _sec(v) else 0
        meilleur = max(meilleur, courant)
    return meilleur


def date_semis(pluie: list[Optional[float]], i_debut: int, i_fin: int) -> Optional[int]:
    """Indice du jour de semis dans [i_debut, i_fin], ou None."""
    for i in range(max(i_debut, JOURS_CUMUL - 1), min(i_fin, len(pluie) - 1) + 1):
        cumul = sum(v or 0.0 for v in pluie[i - JOURS_CUMUL + 1 : i + 1])
        if cumul < SEUIL_CUMUL_MM:
            continue
        suite = pluie[i + 1 : i + 1 + VERIF_JOURS]
        if len(suite) < VERIF_JOURS:
            return None
        if _plus_longue_poche(suite) < POCHE_SECHE_JOURS:
            return i
    return None


def stades_jours(culture: dict) -> list[int]:
    """Durées des 4 stades FAO-56 ramenées à la durée du cycle de la fiche (le dernier absorbe l'arrondi)."""
    ref = culture["stades"]["jours"]
    total = culture["cycleJours"]
    d = [round(x * total / sum(ref)) for x in ref[:3]]
    return d + [total - sum(d)]


def _kc(jour: int, stades: list[int], kc: list[float]) -> float:
    ini, dev, mid, _ = stades
    k_ini, k_mid, k_fin = kc
    if jour < ini:
        return k_ini
    if jour < ini + dev:
        return k_ini + (k_mid - k_ini) * (jour - ini + 1) / dev
    if jour < ini + dev + mid:
        return k_mid
    late = sum(stades) - ini - dev - mid
    return k_mid + (k_fin - k_mid) * (jour - ini - dev - mid + 1) / max(1, late)


def _complete(v: list[Optional[float]]) -> list[float]:
    valides = [x for x in v if x is not None]
    moyenne = sum(valides) / len(valides) if valides else 0.0
    return [moyenne if x is None else x for x in v]


def bilan(pluie, tmax, tmin, lat: float, jour0: date, i_semis: int, culture: dict, reserve_mm: float = RESERVE_MM) -> Optional[dict]:
    """Bilan d'eau du semis à la récolte. None si le cycle dépasse la série ou si plus de 10 % des jours manquent."""
    stades = stades_jours(culture)
    n = sum(stades)
    fin = i_semis + n
    if fin > len(pluie):
        return None
    p, tx, tn = pluie[i_semis:fin], tmax[i_semis:fin], tmin[i_semis:fin]
    manquants = sum(1 for k in range(n) if p[k] is None or tx[k] is None or tn[k] is None)
    if manquants > MANQUANT_MAX * n:
        return None
    p_c = [x or 0.0 for x in p]
    tx_c, tn_c = _complete(tx), _complete(tn)
    debut_mid, fin_mid = stades[0] + stades[1], stades[0] + stades[1] + stades[2]
    epuise = reserve_mm / 2
    eta_p = etc_p = 0.0
    for k in range(n):
        j = (jour0 + timedelta(days=i_semis + k)).timetuple().tm_yday
        etc = _kc(k, stades, culture["stades"]["kc"]) * et0_hargreaves(tx_c[k], tn_c[k], ra_mm(lat, j))
        seuil = FRACTION_P * reserve_mm
        ks = 1.0 if epuise <= seuil else max(0.0, (reserve_mm - epuise) / (reserve_mm - seuil))
        eta = ks * etc
        epuise = min(reserve_mm, max(0.0, epuise - p_c[k] + eta))
        poids = 2.0 if debut_mid <= k < fin_mid else 1.0
        eta_p += poids * eta
        etc_p += poids * etc
    return {
        "ratio": round(eta_p / etc_p, 3) if etc_p else 1.0,
        "pocheFloraison": _plus_longue_poche(p[debut_mid:fin_mid]),
        "pocheMax": _plus_longue_poche(p),
    }


def _de(nom: str) -> str:
    n = nom.lower()
    return f"de l'{n}" if n[0] in "aeiouyéèêàâîïôûh" else f"du {n}"


def verdict_saison(jours: dict, lat: float, annee: int, saison: dict, culture: dict) -> Optional[dict]:
    """Verdict d'une saison (bonne, difficile, perdue) pour une culture, ou None si les données ne permettent pas de juger."""
    jour0 = date.fromisoformat(jours["debut"])
    pluie = jours["pluie"]
    mois_fin = min(12, saison["debut"] + 2)
    i_debut = (date(annee, saison["debut"], 1) - jour0).days
    i_fin = (date(annee, mois_fin, calendar.monthrange(annee, mois_fin)[1]) - jour0).days
    if i_debut < 0 or i_fin + VERIF_JOURS >= len(pluie):
        return None
    fenetre = pluie[i_debut : i_fin + 1]
    if sum(1 for v in fenetre if v is None) > MANQUANT_MAX * len(fenetre):
        return None
    i = date_semis(pluie, i_debut, i_fin)
    if i is None:
        return {"annee": annee, "verdict": "perdue", "semis": None, "ratio": None, "cause": "pas assez de pluie pour semer"}
    b = bilan(pluie, jours["tmax"], jours["tmin"], lat, jour0, i, culture)
    if b is None:
        return None
    r = b["ratio"]
    verdict = "bonne" if r >= 0.75 else "difficile" if r >= 0.5 else "perdue"
    if b["pocheFloraison"] >= POCHE_SECHE_JOURS:
        cause = f"{b['pocheFloraison']} jours secs pendant la floraison {_de(culture['nom'])}"
    elif verdict == "bonne":
        cause = "eau suffisante tout le cycle"
    else:
        cause = "pluie insuffisante sur le cycle"
    return {"annee": annee, "verdict": verdict, "semis": (jour0 + timedelta(days=i)).isoformat(), "ratio": round(r, 2), "cause": cause}
