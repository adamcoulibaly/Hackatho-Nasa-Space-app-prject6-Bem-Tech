"""Télécharge le climat mensuel d'un point (NASA POWER, sans clé) vers data/raw/.

Usage : python3 fetch_power.py [latitude longitude début fin]
Par défaut : Korhogo (9.46, -5.63), 2005 à 2025.
"""
from __future__ import annotations

import sys
import urllib.parse
import urllib.request
from pathlib import Path

RAW = Path(__file__).resolve().parent.parent / "raw" / "power_korhogo_monthly.json"
URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"


def telecharger(lat: float | str, lon: float | str, debut: int | str = 2005, fin: int | str = 2025) -> bytes:
    """Réponse JSON brute de NASA POWER (pluie corrigée et température max., mensuelles)."""
    params = {
        "parameters": "T2M_MAX,PRECTOTCORR,GWETROOT",
        "community": "AG",
        "latitude": lat,
        "longitude": lon,
        "start": debut,
        "end": fin,
        "format": "JSON",
    }
    req = urllib.request.Request(f"{URL}?{urllib.parse.urlencode(params)}", headers={"User-Agent": "forosat-hackathon"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def telecharger_jours(lat: float | str, lon: float | str, debut: str, fin: str) -> bytes:
    """Série quotidienne (AAAAMMJJ) : pluie, température max., humidité du sol."""
    params = {"parameters": "PRECTOTCORR,T2M_MAX,GWETROOT", "community": "AG", "latitude": lat, "longitude": lon, "start": debut, "end": fin, "format": "JSON"}
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    req = urllib.request.Request(f"{url}?{urllib.parse.urlencode(params)}", headers={"User-Agent": "forosat-hackathon"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def main(argv: list[str]) -> int:
    lat, lon, debut, fin = (argv + ["9.46", "-5.63", "2005", "2025"][len(argv):])[:4]
    corps = telecharger(lat, lon, debut, fin)
    RAW.parent.mkdir(parents=True, exist_ok=True)
    RAW.write_bytes(corps)
    print(f"{len(corps)} octets écrits dans {RAW}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
