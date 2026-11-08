"""NDVI mensuel MODIS Terra lu dans les tuiles NASA GIBS (sans compte).

Chaque tuile PNG est indexée par une palette ; l'échelle de couleurs officielle de GIBS
(MODIS_L3_NDVI.xml) associe chaque couleur à une plage de NDVI. On lit le pixel du chef-lieu
(moyenne 3 × 3, environ 1 km au zoom 7) pour chaque mois.
"""
from __future__ import annotations

import io
import math
import re
from typing import Callable, Optional

from PIL import Image

COUCHE = "MODIS_Terra_L3_NDVI_Monthly"
ZOOM = 7
URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{couche}/default/{date}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png"


def charger_palette(xml: str) -> dict[tuple[int, int, int], Optional[float]]:
    """Couleur RVB → valeur (milieu de la plage ; borne finie pour une plage ouverte ±INF),
    None pour les couleurs transparentes (pas de donnée). Sert au NDVI comme à GRACE."""
    palette: dict[tuple[int, int, int], Optional[float]] = {}
    for tag in re.findall(r"<ColorMapEntry\b[^>]*>", xml):
        rgb_m = re.search(r'rgb="(\d+),(\d+),(\d+)"', tag)
        if not rgb_m:
            continue
        rgb = (int(rgb_m.group(1)), int(rgb_m.group(2)), int(rgb_m.group(3)))
        if rgb in palette:
            continue
        val = re.search(r'\bvalue="\[([^,]+),([^)\]]+)[)\]]"', tag)
        if 'transparent="true"' in tag or not val:
            palette[rgb] = None
            continue
        lo, hi = val.group(1).strip(), val.group(2).strip()
        if "INF" in lo:
            palette[rgb] = float(hi)
        elif "INF" in hi:
            palette[rgb] = float(lo)
        else:
            palette[rgb] = round((float(lo) + float(hi)) / 2, 4)
    return palette


def position_tuile(lat: float, lon: float, z: int = ZOOM) -> tuple[int, int, int, int]:
    """Tuile (x, y) et pixel (px, py) d'un point en Web Mercator."""
    n = 2**z
    x = (lon + 180.0) / 360.0 * n
    lat_r = math.radians(lat)
    y = (1.0 - math.asinh(math.tan(lat_r)) / math.pi) / 2.0 * n
    return int(x), int(y), int((x % 1) * 256), int((y % 1) * 256)


# Anneau autour du chef-lieu, en pixels (≈ 1,2 km au zoom 7) : on écarte la ville, on garde la campagne cultivée.
ANNEAU_MIN, ANNEAU_MAX = 6, 15


def ndvi_au_point(png: bytes, px: int, py: int, palette: dict, rayon_min: int = ANNEAU_MIN, rayon_max: int = ANNEAU_MAX) -> Optional[float]:
    """Moyenne des NDVI valides sur l'anneau [rayon_min, rayon_max] pixels autour du point, None s'il n'y en a aucun.

    Les pixels hors de la tuile sont ignorés (l'anneau est alors partiel). L'eau et les nuages (couleurs
    transparentes de l'échelle GIBS) sont exclus.
    """
    im = Image.open(io.BytesIO(png))
    transparent = im.info.get("transparency")
    pal = im.getpalette() if im.mode == "P" else None
    valeurs = []
    for dx in range(-rayon_max, rayon_max + 1):
        for dy in range(-rayon_max, rayon_max + 1):
            if not (rayon_min ** 2 <= dx * dx + dy * dy <= rayon_max ** 2):
                continue
            x, y = px + dx, py + dy
            if not (0 <= x < 256 and 0 <= y < 256):
                continue
            v = im.getpixel((x, y))
            if pal is not None:
                if isinstance(transparent, int) and v == transparent:
                    continue
                rgb = tuple(pal[v * 3 : v * 3 + 3])
            else:
                if len(v) == 4 and v[3] == 0:
                    continue
                rgb = tuple(v[:3])
            ndvi = palette.get(rgb)
            if ndvi is not None:
                valeurs.append(ndvi)
    return round(sum(valeurs) / len(valeurs), 4) if valeurs else None


def serie_ndvi(points: dict[str, tuple[float, float]], mois: list[str], lire_tuile: Callable[[str, int, int], Optional[bytes]], palette: dict) -> dict[str, dict[str, Optional[float]]]:
    """{id: {"AAAAMM": ndvi}} pour chaque point et chaque mois ; lire_tuile(date, x, y) renvoie le PNG ou None."""
    out: dict[str, dict[str, Optional[float]]] = {pid: {} for pid in points}
    for m in mois:
        date = f"{m[:4]}-{m[4:]}-01"
        cache: dict[tuple[int, int], Optional[bytes]] = {}
        for pid, (lat, lon) in points.items():
            tx, ty, px, py = position_tuile(lat, lon)
            if (tx, ty) not in cache:
                cache[(tx, ty)] = lire_tuile(date, tx, ty)
            png = cache[(tx, ty)]
            out[pid][m] = ndvi_au_point(png, px, py, palette) if png else None
    return out
