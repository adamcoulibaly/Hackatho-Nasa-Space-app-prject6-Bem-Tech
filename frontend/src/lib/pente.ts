/**
 * Pente de la parcelle dessinée, à partir de l'altitude SRTM (NASA), lue dans les tuiles Terrain d'AWS Open Data
 * (format « terrarium » : l'altitude est codée dans les couleurs de chaque pixel ; en Côte d'Ivoire, la source
 * déclarée de chaque tuile est SRTM).
 */

export const ZOOM_PENTE = 13;
export const TAILLE_TUILE = 256;
export const URL_TERRAIN = (z: number, x: number, y: number) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

export type PointLatLon = [number, number];
export type ClassePente = "faible" | "modere" | "fort" | "tres-fort";
export type Pente = {
  /** Pente moyenne de la parcelle, en %. */
  moyenne: number;
  /** Pente des parties les plus raides (9 points sur 10 sont en dessous), en %. */
  forte: number;
  altitudeMin: number;
  altitudeMax: number;
  classe: ClassePente;
  /** Nombre de points d'altitude mesurés dans la parcelle. */
  points: number;
};

/** Position globale d'un point en pixels de tuile, au zoom z (projection Web Mercator). */
export function pixelGlobal(lat: number, lon: number, z: number): { gx: number; gy: number } {
  const n = 2 ** z * TAILLE_TUILE;
  const s = Math.sin((lat * Math.PI) / 180);
  return { gx: ((lon + 180) / 360) * n, gy: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
}

/** Taille d'un pixel au sol (m) à cette latitude et ce zoom. */
export function metresParPixel(lat: number, z: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

/** Altitude (m) codée dans un pixel terrarium. */
export function altitudeTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

/** Point dans le polygone (lancer de rayon), en coordonnées quelconques. */
export function dansPolygone(x: number, y: number, poly: { x: number; y: number }[]): boolean {
  let dedans = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) dedans = !dedans;
  }
  return dedans;
}

export function classePente(pct: number): ClassePente {
  if (pct < 2) return "faible";
  if (pct < 5) return "modere";
  if (pct < 10) return "fort";
  return "tres-fort";
}

export const LIBELLE_CLASSE: Record<ClassePente, string> = {
  faible: "Terrain presque plat",
  modere: "Pente douce",
  fort: "Pente marquée",
  "tres-fort": "Forte pente",
};

/** Conseil d'érosion lié à la pente (repères FAO : sous 2 % l'eau ruisselle peu, au-delà de 5 % le sol part vite). */
export function conseilPente(p: Pente): string {
  switch (p.classe) {
    case "faible":
      return "Peu de risque d'érosion : l'eau ruisselle peu. Gardez quand même le sol couvert après la récolte.";
    case "modere":
      return "Risque d'érosion modéré : billonnez en travers de la pente et gardez une culture de couverture entre deux saisons.";
    case "fort":
      return "Risque d'érosion fort : cultivez en courbes de niveau, laissez des bandes enherbées et préférez une rotation bien notée en anti-érosion.";
    default:
      return "Risque d'érosion très fort : évitez de laisser le sol nu, cultivez en courbes de niveau ou en terrasses, et choisissez la rotation la mieux notée en anti-érosion.";
  }
}

/** Écart (en pixels) des différences centrées : 2 pixels de part et d'autre (≈ 76 m), proche de la finesse réelle de SRTM (30 m) et moins sensible à son bruit vertical. */
const PAS_LOCAL = 2;

/** Pente (%) du plan qui colle le mieux aux altitudes (moindres carrés) : la pente générale du champ, robuste au bruit. */
export function pentePlan(pts: { x: number; y: number; z: number }[], m: number): number | null {
  const n = pts.length;
  if (n < 6) return null;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n, mz = pts.reduce((s, p) => s + p.z, 0) / n;
  let sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
  for (const p of pts) {
    const dx = p.x - mx, dy = p.y - my, dz = p.z - mz;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy; sxz += dx * dz; syz += dy * dz;
  }
  const det = sxx * syy - sxy * sxy;
  if (Math.abs(det) < 1e-9) return null;
  const a = (sxz * syy - syz * sxy) / det, b = (syz * sxx - sxz * sxy) / det;
  return (Math.hypot(a, b) / m) * 100;
}

/**
 * Pente de la parcelle : pente générale = plan ajusté aux altitudes de tous les pixels du contour ; parties raides =
 * 9e décile des pentes locales (différences centrées sur ±2 pixels). `altitude(gx, gy)` lit l'altitude au pixel global.
 */
export function penteParcelle(contour: PointLatLon[], altitude: (gx: number, gy: number) => number | null, z = ZOOM_PENTE): Pente | null {
  if (contour.length < 3) return null;
  const poly = contour.map(([lat, lon]) => { const p = pixelGlobal(lat, lon, z); return { x: p.gx, y: p.gy }; });
  const latMoy = contour.reduce((s, [lat]) => s + lat, 0) / contour.length;
  const m = metresParPixel(latMoy, z);
  const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
  let x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs)), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  // Une parcelle plus petite qu'un pixel : on mesure quand même au pixel qui la contient.
  const petite = x1 - x0 <= 1 && y1 - y0 <= 1;
  if (petite) { x1 = x0; y1 = y0; }
  const locales: number[] = [];
  const points: { x: number; y: number; z: number }[] = [];
  const k = PAS_LOCAL;
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (!petite && !dansPolygone(gx + 0.5, gy + 0.5, poly)) continue;
      const c = altitude(gx, gy);
      if (c === null) continue;
      points.push({ x: gx, y: gy, z: c });
      const e = altitude(gx + k, gy), w = altitude(gx - k, gy), n = altitude(gx, gy - k), s = altitude(gx, gy + k);
      if (e === null || w === null || n === null || s === null) continue;
      locales.push(Math.hypot((e - w) / (2 * k * m), (s - n) / (2 * k * m)) * 100);
    }
  }
  if (!locales.length) return null;
  const tri = [...locales].sort((a, b) => a - b);
  const moyenne = pentePlan(points, m) ?? locales.reduce((s, v) => s + v, 0) / locales.length;
  const forte = Math.max(moyenne, tri[Math.min(tri.length - 1, Math.floor(tri.length * 0.9))]);
  const arrondi = (v: number) => Math.round(v * 10) / 10;
  const alts = points.map((p) => p.z);
  return {
    moyenne: arrondi(moyenne),
    forte: arrondi(forte),
    altitudeMin: Math.round(Math.min(...alts)),
    altitudeMax: Math.round(Math.max(...alts)),
    classe: classePente(moyenne),
    points: points.length,
  };
}

/** Tuiles (x, y) à lire pour couvrir le contour et un pixel de marge autour. */
export function tuilesDuContour(contour: PointLatLon[], z = ZOOM_PENTE): { x: number; y: number }[] {
  const ps = contour.map(([lat, lon]) => pixelGlobal(lat, lon, z));
  const tx0 = Math.floor((Math.min(...ps.map((p) => p.gx)) - 4) / TAILLE_TUILE), tx1 = Math.floor((Math.max(...ps.map((p) => p.gx)) + 4) / TAILLE_TUILE);
  const ty0 = Math.floor((Math.min(...ps.map((p) => p.gy)) - 4) / TAILLE_TUILE), ty1 = Math.floor((Math.max(...ps.map((p) => p.gy)) + 4) / TAILLE_TUILE);
  const t: { x: number; y: number }[] = [];
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) t.push({ x, y });
  return t;
}

/** Clé courte d'un contour (coins arrondis à environ 1 m) : la pente mesurée appartient à ce contour-là. */
export function cleContour(contour: PointLatLon[]): string {
  let h = 2166136261;
  for (const [lat, lon] of contour) {
    for (const c of `${lat.toFixed(5)},${lon.toFixed(5)};`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  }
  return `${contour.length}-${h.toString(36)}`;
}

/** La rotation la mieux notée en anti-érosion (la recommandée d'abord en cas d'égalité). */
export function meilleureAntiErosion<R extends { id: string; recommandee: boolean; scores: { erosion: number } }>(rotations: R[]): R {
  return [...rotations].sort((a, b) => b.scores.erosion - a.scores.erosion || Number(b.recommandee) - Number(a.recommandee))[0];
}
