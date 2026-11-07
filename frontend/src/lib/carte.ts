import type { Couche } from "@/lib/contract";

export const KORHOGO: [number, number] = [9.458, -5.6316];

/** Adresse des tuiles NASA GIBS (WMTS, Web Mercator) d'une couche pour une année donnée. */
export function gibsTileUrl(couche: Couche, annee: number): string {
  const { couche: nom, format, niveau, date } = couche.gibs;
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${nom}/default/${annee}-${date}/GoogleMapsCompatible_Level${niveau}/{z}/{y}/{x}.${format}`;
}

export function anneeDisponible(couche: Couche, annee: number): boolean {
  return annee >= couche.gibs.depuis;
}

const RAYON_TERRE = 6378137;
const rad = (d: number) => (d * Math.PI) / 180;

/** Surface d'un polygone [lat, lon] en hectares (formule sphérique, précise pour une parcelle). */
export function surfaceHa(points: [number, number][]): number {
  if (points.length < 3) return 0;
  let somme = 0;
  for (let i = 0; i < points.length; i++) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[(i + 1) % points.length];
    somme += rad(lon2 - lon1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.abs((somme * RAYON_TERRE * RAYON_TERRE) / 2) / 10000;
}

/** Recherche d'une localité en Côte d'Ivoire (Nominatim, OpenStreetMap, sans clé). */
export function nominatimUrl(requete: string): string {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("q", requete);
  u.searchParams.set("format", "json");
  u.searchParams.set("limit", "5");
  u.searchParams.set("countrycodes", "ci");
  u.searchParams.set("accept-language", "fr");
  return u.toString();
}

export function lireNominatim(json: unknown): { lat: number; lon: number; nom: string } | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const r = json[0] as { lat?: string; lon?: string; display_name?: string };
  const lat = Number(r.lat);
  const lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, nom: r.display_name ?? "" };
}

export type Lieu = { lat: number; lon: number; nom: string; cadre?: [[number, number], [number, number]] };

/** Jusqu'à 5 lieux valides d'une réponse Nominatim, avec leur cadre quand il est fourni. */
export function lireNominatimListe(json: unknown): Lieu[] {
  if (!Array.isArray(json)) return [];
  const lieux: Lieu[] = [];
  for (const r of json.slice(0, 5) as { lat?: string; lon?: string; display_name?: string; boundingbox?: string[] }[]) {
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const b = r.boundingbox?.map(Number);
    const cadre = b && b.length === 4 && b.every(Number.isFinite) ? ([[b[0], b[2]], [b[1], b[3]]] as Lieu["cadre"]) : undefined;
    lieux.push(cadre ? { lat, lon, nom: r.display_name ?? "", cadre } : { lat, lon, nom: r.display_name ?? "" });
  }
  return lieux;
}
