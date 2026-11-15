import liste from "./regions.json";
import { libellePoint, pointDepuisId } from "./monde/lieu";

/** Les 31 régions et 2 districts autonomes de Côte d'Ivoire, avec leur chef-lieu (géocodé sur OpenStreetMap). */
export type Region = { id: string; nom: string; chefLieu: string; district: string; lat: number; lon: number };

export const REGIONS: Region[] = liste;
export const REGION_IDS = REGIONS.map((r) => r.id) as [string, ...string[]];
export const REGION_PILOTE = "poro";

/**
 * Région ivoirienne, ou point du monde (« pt_<lat>_<lon> ») présenté comme une région : son climat et ses saisons
 * sont calculés à la demande depuis NASA POWER.
 */
export function regionParId(id: string): Region | undefined {
  const r = REGIONS.find((x) => x.id === id);
  if (r) return r;
  const p = pointDepuisId(id);
  if (!p) return undefined;
  const nom = libellePoint(p.lat, p.lon);
  return { id, nom, chefLieu: nom, district: "", lat: p.lat, lon: p.lon };
}

/** Vrai pour une des 33 régions ivoiriennes (données pré-calculées, projections 2050 comprises). */
export const estRegionIvoirienne = (id: string) => REGIONS.some((r) => r.id === id);

export function libelleRegion(r: Region): string {
  return r.nom.startsWith("District") ? r.nom : `${r.nom} (${r.chefLieu})`;
}

/** Région dont le chef-lieu est le plus proche d'un point (approximation suffisante pour proposer une région). */
export function regionLaPlusProche(lat: number, lon: number): Region {
  const d = (r: Region) => (r.lat - lat) ** 2 + ((r.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
  return REGIONS.reduce((a, b) => (d(b) < d(a) ? b : a));
}

/** Régions regroupées par district, dans l'ordre alphabétique, pour la liste de choix. */
export function regionsParDistrict(): [string, Region[]][] {
  const groupes = new Map<string, Region[]>();
  for (const r of [...REGIONS].sort((a, b) => a.nom.localeCompare(b.nom, "fr"))) {
    const g = r.nom.startsWith("District") ? "Districts autonomes" : r.district;
    groupes.set(g, [...(groupes.get(g) ?? []), r]);
  }
  return [...groupes.entries()].sort(([a], [b]) => (a === "Districts autonomes" ? -1 : b === "Districts autonomes" ? 1 : a.localeCompare(b, "fr")));
}
