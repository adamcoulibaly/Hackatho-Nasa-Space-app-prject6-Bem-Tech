/**
 * Un point du monde comme « région » : la cellule NASA POWER (0,5°) qui contient la parcelle.
 * Identifiant : « pt_<lat>_<lon> » (ex. pt_14.5_-17.0), arrondi à la demi-degré pour que les voisins
 * partagent le même calcul (et le même cache).
 */
export const PAS_DEGRES = 0.5;
const MOTIF = /^pt_(-?\d{1,2}(?:\.\d)?)_(-?\d{1,3}(?:\.\d)?)$/;

const caler = (v: number) => Math.round(v / PAS_DEGRES) * PAS_DEGRES;
const texte = (v: number) => (Object.is(v, -0) ? 0 : v).toFixed(1);

export function idPoint(lat: number, lon: number): string {
  const la = Math.max(-60, Math.min(70, caler(lat)));
  let lo = caler(lon);
  if (lo > 180) lo -= 360;
  if (lo < -180) lo += 360;
  return `pt_${texte(la)}_${texte(lo)}`;
}

export function estPoint(id: string): boolean {
  return pointDepuisId(id) !== null;
}

export function pointDepuisId(id: string): { lat: number; lon: number } | null {
  const m = MOTIF.exec(id);
  if (!m) return null;
  const lat = Number(m[1]), lon = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -60 || lat > 70 || lon < -180 || lon > 180) return null;
  if (idPoint(lat, lon) !== id) return null;
  return { lat, lon };
}

const deg = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(1).replace(".", ",")}° ${v >= 0 ? pos : neg}`;
/** « 14,5° N · 17,0° O » */
export const libellePoint = (lat: number, lon: number) => `${deg(lat, "N", "S")} · ${deg(lon, "E", "O")}`;
