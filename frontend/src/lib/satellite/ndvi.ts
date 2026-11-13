/**
 * NDVI MODIS Terra mensuel au point de la parcelle, lu dans les tuiles NASA GIBS (sans compte), comme le pipeline
 * (data/pipeline/ndvi_gibs.py) : couche, zoom 7 (pixel d'environ 1,2 km) et échelle de couleurs officielle identiques.
 */
import { PNG } from "pngjs";
import entrees from "./palette-ndvi.json";

export const COUCHE = "MODIS_Terra_L3_NDVI_Monthly";
export const ZOOM = 7;
const URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{couche}/default/{date}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png";
const ESSAIS = 4;

export type Palette = Map<string, number | null>;

/** Couleur « r,g,b » → NDVI (milieu de la plage ; borne finie pour une plage ouverte), null pour « pas de donnée ». */
export function chargerPalette(xml: string): Palette {
  const palette: Palette = new Map();
  for (const tag of xml.match(/<ColorMapEntry\b[^>]*>/g) ?? []) {
    const rgb = tag.match(/rgb="(\d+),(\d+),(\d+)"/);
    if (!rgb) continue;
    const cle = `${rgb[1]},${rgb[2]},${rgb[3]}`;
    if (palette.has(cle)) continue;
    const val = tag.match(/\bvalue="\[([^,]+),([^)\]]+)[)\]]"/);
    if (tag.includes('transparent="true"') || !val) {
      palette.set(cle, null);
      continue;
    }
    const [lo, hi] = [val[1].trim(), val[2].trim()];
    if (lo.includes("INF")) palette.set(cle, Number(hi));
    else if (hi.includes("INF")) palette.set(cle, Number(lo));
    // Arrondi sur la valeur binaire exacte, comme round() en Python : mêmes valeurs que le pipeline.
    else palette.set(cle, Number(((Number(lo) + Number(hi)) / 2).toFixed(4)));
  }
  return palette;
}

/** Palette officielle embarquée (générée depuis MODIS_L3_NDVI.xml de GIBS, vérifiée par les tests). */
export const PALETTE_NDVI: Palette = new Map(entrees as [string, number | null][]);

/** Tuile (x, y) et pixel (px, py) d'un point en Web Mercator. */
export function positionTuile(lat: number, lon: number, z = ZOOM): { x: number; y: number; px: number; py: number } {
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const y = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
  return { x: Math.floor(x), y: Math.floor(y), px: Math.floor((x % 1) * 256), py: Math.floor((y % 1) * 256) };
}

/** Moyenne des NDVI valides sur 3 × 3 pixels autour du point ; pixels hors tuile, transparents ou sans donnée ignorés. */
export function ndviFenetre(png: Buffer, px: number, py: number, palette: Palette): number | null {
  const img = PNG.sync.read(png);
  const valeurs: number[] = [];
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const x = px + dx;
      const y = py + dy;
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] === 0) continue;
      const v = palette.get(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`);
      if (v != null) valeurs.push(v);
    }
  return valeurs.length ? Math.round((valeurs.reduce((a, b) => a + b, 0) / valeurs.length) * 1e4) / 1e4 : null;
}

/** NDVI d'un mois précis (AAAA-MM) au point, ou null si l'image manque ou est illisible. */
export async function ndviMois(lat: number, lon: number, mois: string, lire: (url: string) => Promise<Buffer | null>): Promise<number | null> {
  const { x, y, px, py } = positionTuile(lat, lon);
  const url = URL.replace("{couche}", COUCHE).replace("{date}", `${mois}-01`).replace("{z}", String(ZOOM)).replace("{y}", String(y)).replace("{x}", String(x));
  const png = await lire(url).catch(() => null);
  if (!png) return null;
  try {
    return ndviFenetre(png, px, py, PALETTE_NDVI);
  } catch {
    return null;
  }
}

/** NDVI du dernier mois publié au point : le mois précédent, puis on recule (4 mois au plus) ; null si aucune image. */
export async function ndviParcelle(
  lat: number,
  lon: number,
  aujourdhui: Date,
  lire: (url: string) => Promise<Buffer | null>,
): Promise<{ ndvi: number; mois: string } | null> {
  const { x, y, px, py } = positionTuile(lat, lon);
  for (let k = 1; k <= ESSAIS; k++) {
    const d = new Date(Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth() - k, 1));
    const mois = d.toISOString().slice(0, 7);
    const url = URL.replace("{couche}", COUCHE).replace("{date}", `${mois}-01`).replace("{z}", String(ZOOM)).replace("{y}", String(y)).replace("{x}", String(x));
    const png = await lire(url).catch(() => null);
    if (!png) continue;
    const ndvi = (() => {
      try {
        return ndviFenetre(png, px, py, PALETTE_NDVI);
      } catch {
        return null;
      }
    })();
    if (ndvi !== null) return { ndvi, mois };
  }
  return null;
}
