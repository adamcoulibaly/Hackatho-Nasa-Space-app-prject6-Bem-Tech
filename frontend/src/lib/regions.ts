import liste from "./regions.json";

/** Les 31 régions et 2 districts autonomes de Côte d'Ivoire, avec leur chef-lieu (géocodé sur OpenStreetMap). */
export type Region = { id: string; nom: string; chefLieu: string; district: string; lat: number; lon: number };

export const REGIONS: Region[] = liste;
export const REGION_IDS = REGIONS.map((r) => r.id) as [string, ...string[]];
export const REGION_PILOTE = "poro";

export function regionParId(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

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
