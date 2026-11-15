"""ECOSTRESS des 33 régions (2023–2024) → data/raw/ecostress.json.

Recherche des passages dans le catalogue CMR (sans compte), puis lecture des images COG chez NASA LP DAAC, qui
demande un jeton Earthdata (EARTHDATA_TOKEN, ou ajouté par le proxy de l'environnement). Demande rasterio
(pip install rasterio). Long : plusieurs milliers d'images ; le résultat est mis en cache par passage.
Usage : python3 build_ecostress.py      (puis python3 ajoute_satellites.py)
"""
from __future__ import annotations

import json
import math
import os
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from ecostress import anneau, de_jour, kelvin_vers_celsius, resume, valeur_passage

ICI = Path(__file__).resolve().parent
REGIONS = ICI.parent.parent / "frontend" / "src" / "lib" / "regions.json"
SORTIE = ICI.parent / "raw" / "ecostress.json"
CACHE = ICI.parent / "raw" / "ecostress-cache.json"
DEBUT, FIN = "2023-01-01T00:00:00Z", "2024-12-31T23:59:59Z"
CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "2")
if os.environ.get("EARTHDATA_TOKEN"):
    os.environ["GDAL_HTTP_HEADERS"] = f"Authorization: Bearer {os.environ['EARTHDATA_TOKEN']}"
CA = os.environ.get("CURL_CA_BUNDLE") or ("/root/.ccr/ca-bundle.crt" if Path("/root/.ccr/ca-bundle.crt").exists() else None)
if CA:
    os.environ["GDAL_CURL_CA_BUNDLE"] = os.environ["CURL_CA_BUNDLE"] = CA

import rasterio  # noqa: E402  (après la configuration de GDAL)
from rasterio.warp import transform  # noqa: E402


def passages(produit: str, lat: float, lon: float) -> list[dict]:
    """Passages de jour (heure, liens des couches) qui couvrent le cercle de mesure."""
    sud, nord = lat - 0.12, lat + 0.12
    ouest, est = lon - 0.12, lon + 0.12
    res, page = [], 1
    while True:
        q = urllib.parse.urlencode({"short_name": produit, "version": "002", "bounding_box": f"{ouest},{sud},{est},{nord}",
                                    "temporal": f"{DEBUT},{FIN}", "page_size": 2000, "page_num": page})
        with urllib.request.urlopen(f"{CMR}?{q}", timeout=120) as r:
            entrees = json.load(r)["feed"]["entry"]
        for e in entrees:
            if not de_jour(e["time_start"]):
                continue
            liens = {l["href"].rsplit("_", 1)[-1][:-4]: l["href"] for l in e["links"] if l["href"].startswith("https://") and l["href"].endswith(".tif")}
            res.append({"heure": e["time_start"][:19], "liens": liens})
        if len(entrees) < 2000:
            return res
        page += 1


def lire_points(url: str, points: list[tuple[float, float]]) -> list[Optional[float]]:
    """Valeurs de l'image aux points (None hors de la tuile ou sans donnée)."""
    with rasterio.open("/vsicurl/" + url) as d:
        xs, ys = transform("EPSG:4326", d.crs, [p[1] for p in points], [p[0] for p in points])
        idx = [d.index(x, y) for x, y in zip(xs, ys)]
        dedans = [(r, c) for r, c in idx if 0 <= r < d.height and 0 <= c < d.width]
        if not dedans:
            return [None] * len(points)
        r0, r1 = min(r for r, _ in dedans), max(r for r, _ in dedans)
        c0, c1 = min(c for _, c in dedans), max(c for _, c in dedans)
        bloc = d.read(1, window=((r0, r1 + 1), (c0, c1 + 1)))
        nodata = d.nodata
        out: list[Optional[float]] = []
        for r, c in idx:
            if not (0 <= r < d.height and 0 <= c < d.width):
                out.append(None)
                continue
            v = float(bloc[r - r0, c - c0])
            out.append(None if not math.isfinite(v) or (nodata is not None and v == nodata) else v)
        return out


def un_passage(tache: tuple[str, str, dict, list[tuple[float, float]]]) -> tuple[str, str, Optional[list[Optional[float]]]]:
    rid, produit, p, points = tache
    try:
        if produit == "lst":
            lst = lire_points(p["liens"]["LST"], points)
            nuage = lire_points(p["liens"]["cloud"], points)
            eau = lire_points(p["liens"]["water"], points) if "water" in p["liens"] else [0] * len(points)
            vals = [kelvin_vers_celsius(v) if v is not None and v > 200 and not n and not e else None for v, n, e in zip(lst, nuage, eau)]
        else:
            et = lire_points(p["liens"]["ETdaily"], points)
            nuage = lire_points(p["liens"]["cloud"], points) if "cloud" in p["liens"] else [0] * len(points)
            vals = [v if v is not None and 0 <= v < 20 and not n else None for v, n in zip(et, nuage)]
        return rid, f"{produit}|{p['heure']}", vals
    except Exception as e:  # une image illisible ne bloque pas les autres
        print("  illisible", p["heure"], type(e).__name__, str(e)[:80], flush=True)
        return rid, f"{produit}|{p['heure']}", None


def main() -> int:
    regions = json.loads(REGIONS.read_text(encoding="utf-8"))
    cache: dict[str, dict[str, Optional[list[Optional[float]]]]] = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    taches = []
    for r in regions:
        pts = anneau(r["lat"], r["lon"])
        deja = cache.setdefault(r["id"], {})
        for produit, court, couches in (("ECO_L2T_LSTE", "lst", ("LST", "cloud")), ("ECO_L3T_JET", "et", ("ETdaily",))):
            for p in passages(produit, r["lat"], r["lon"]):
                if all(c in p["liens"] for c in couches) and f"{court}|{p['heure']}|{p['liens'][couches[0]][-60:]}" not in deja:
                    taches.append((r["id"], court, p, pts))
        print(f"{r['chefLieu']:<16} {sum(1 for t in taches if t[0] == r['id'])} images à lire", flush=True)
    print(f"{len(taches)} images au total", flush=True)
    fait = 0
    with ThreadPoolExecutor(max_workers=int(os.environ.get("ECOSTRESS_FILS", "32"))) as pool:
        for (rid, cle, vals), t in zip(pool.map(un_passage, taches), taches):
            if vals is not None:
                cache[rid][f"{cle}|{t[2]['liens']['LST' if t[1] == 'lst' else 'ETdaily'][-60:]}"] = vals
            fait += 1
            if fait % 500 == 0:
                CACHE.write_text(json.dumps(cache) + "\n", encoding="utf-8")
                print(f"  {fait}/{len(taches)}", flush=True)
    CACHE.write_text(json.dumps(cache) + "\n", encoding="utf-8")

    sortie = {}
    for r in regions:
        # Une même acquisition peut tomber sur deux tuiles voisines : on regroupe les points par heure de passage.
        par_heure: dict[tuple[str, str], list[Optional[float]]] = {}
        for cle, vals in cache.get(r["id"], {}).items():
            produit, heure, _ = cle.split("|", 2)
            if vals:
                fusion = par_heure.setdefault((produit, heure), [None] * len(vals))
                par_heure[(produit, heure)] = [a if a is not None else b for a, b in zip(fusion, vals)]
        lst = {h: v for (p, h), vals in par_heure.items() if p == "lst" and (v := valeur_passage(vals)) is not None}
        et = {h: v for (p, h), vals in par_heure.items() if p == "et" and (v := valeur_passage(vals)) is not None}
        res = resume(lst, et, "2023–2024")
        if res:
            sortie[r["id"]] = res
            print(f"{r['chefLieu']:<16} {res['passages']:>3} passages clairs · jours ≥ 40 °C : {res['joursChauds']} · LST {res['lst']} · ET {res['et']}", flush=True)
    SORTIE.write_text(json.dumps(sortie, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print(f"écrit {SORTIE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
