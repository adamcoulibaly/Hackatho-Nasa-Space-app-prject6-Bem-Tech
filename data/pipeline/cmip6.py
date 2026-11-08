"""Projections climatiques NASA NEX-GDDP-CMIP6 (25 km, journalier, corrigées des biais par la NASA).

Lecture sans compte : le nom exact des fichiers vient de la liste publique du dépôt AWS, et le serveur NCCS THREDDS
(NetCDF Subset Service) découpe la boîte de la Côte d'Ivoire pour une année entière en NetCDF-3 (~1 Mo).
"""
from __future__ import annotations

import io
import re
import urllib.parse
from typing import Callable, Optional

import numpy as np
from scipy.io import netcdf_file

MODELES = ["IPSL-CM6A-LR", "MRI-ESM2-0", "GFDL-ESM4"]
SCENARIOS = {"ssp245": "modéré", "ssp585": "pessimiste"}
REFERENCE = range(1995, 2015)
FUTUR = range(2041, 2061)
VARIABLES = ["pr", "tasmax", "tasmin"]
BOITE = {"north": 11, "south": 4, "west": -9, "east": -2.5}

S3 = "https://nex-gddp-cmip6.s3.us-west-2.amazonaws.com/"
NCSS = "https://ds.nccs.nasa.gov/thredds/ncss/grid/AMES/NEX/GDDP-CMIP6/"
_VERSIONS = ["_v2.0", "_v1.1", ""]


def scenario_de(annee: int, scenario: str) -> str:
    """Les années de référence viennent de la simulation historique, les autres du scénario."""
    return "historical" if annee <= 2014 else scenario


def nom_fichier(modele: str, scenario: str, variable: str, annee: int, lister: Callable[[str], list[str]]) -> str:
    """Chemin du fichier (sans le préfixe du dépôt) dans sa version la plus récente : _v2.0, puis _v1.1, puis sans suffixe."""
    prefixe = f"NEX-GDDP-CMIP6/{modele}/{scenario}/r1i1p1f1/{variable}/"
    cles = lister(prefixe)
    for version in _VERSIONS:
        motif = re.compile(rf"/{variable}_day_{re.escape(modele)}_{scenario}_r1i1p1f1_[a-z0-9]+_{annee}{re.escape(version)}\.nc$")
        for c in cles:
            if motif.search(c):
                return c[len("NEX-GDDP-CMIP6/"):]
    raise FileNotFoundError(f"{modele} {scenario} {variable} {annee} introuvable")


def lister_s3(prefixe: str, lire: Callable[[str], bytes]) -> list[str]:
    """Toutes les clés S3 sous un préfixe (pagination comprise)."""
    cles: list[str] = []
    jeton: Optional[str] = None
    while True:
        q = {"list-type": "2", "prefix": prefixe, "max-keys": "1000"}
        if jeton:
            q["continuation-token"] = jeton
        xml = lire(f"{S3}?{urllib.parse.urlencode(q)}").decode("utf8")
        cles += re.findall(r"<Key>([^<]+)</Key>", xml)
        m = re.search(r"<NextContinuationToken>([^<]+)</NextContinuationToken>", xml)
        if not m:
            return cles
        jeton = m.group(1)


def url_ncss(chemin: str, variable: str) -> str:
    q = {"var": variable, **BOITE, "temporal": "all", "accept": "netcdf3"}
    return f"{NCSS}{chemin}?{urllib.parse.urlencode(q)}"


def lire_points(nc: bytes, variable: str, points: dict[str, tuple[float, float]]) -> dict[str, list[float]]:
    """Série journalière à la maille la plus proche de chaque point, en mm/j (pr) ou en °C (tasmax, tasmin)."""
    f = netcdf_file(io.BytesIO(nc), "r", mmap=False)
    lats = np.asarray(f.variables["lat"][:], dtype=float)
    lons = np.asarray(f.variables["lon"][:], dtype=float)
    lons = np.where(lons > 180, lons - 360, lons)
    valeurs = np.asarray(f.variables[variable][:], dtype=float)
    remplissage = getattr(f.variables[variable], "_FillValue", 1e20)
    f.close()
    sortie = {}
    for nom, (lat, lon) in points.items():
        if not (lats.min() - 0.25 <= lat <= lats.max() + 0.25 and lons.min() - 0.25 <= lon <= lons.max() + 0.25):
            raise ValueError(f"{nom} hors de la zone téléchargée")
        i, j = int(np.abs(lats - lat).argmin()), int(np.abs(lons - lon).argmin())
        serie = valeurs[:, i, j]
        serie = np.where(np.abs(serie) >= abs(remplissage) / 10, np.nan, serie)
        serie = serie * 86400 if variable == "pr" else serie - 273.15
        sortie[nom] = [None if np.isnan(v) else round(float(v), 2) for v in serie]
    return sortie


def part_bonnes(verdicts: list[dict]) -> Optional[float]:
    if not verdicts:
        return None
    return round(sum(v["verdict"] == "bonne" for v in verdicts) / len(verdicts), 2)


def aligner_annee(valeurs: list, annee: int) -> list:
    """Ramène une année au calendrier réel : un modèle sans 29 février (365 j une année bissextile) reçoit la valeur du 28."""
    bissextile = annee % 4 == 0 and (annee % 100 != 0 or annee % 400 == 0)
    attendu = 366 if bissextile else 365
    if len(valeurs) == attendu:
        return list(valeurs)
    if bissextile and len(valeurs) == 365:
        return list(valeurs[:59]) + [valeurs[58]] + list(valeurs[59:])
    raise ValueError(f"{annee} : {len(valeurs)} jours, calendrier non pris en charge")
