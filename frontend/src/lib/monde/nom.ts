import { estRegionIvoirienne, libelleRegion, regionParId } from "@/lib/regions";

type Lieu = { region: string; lieu?: string };

/** Nom à afficher pour la zone de la parcelle : la région ivoirienne, ou le lieu trouvé sur la carte. */
export function nomZone(p: Lieu): string {
  const r = regionParId(p.region);
  if (estRegionIvoirienne(p.region) && r) return r.nom;
  return p.lieu ?? r?.nom ?? p.region;
}

/** Nom court (chef-lieu, ou lieu trouvé sur la carte). */
export function nomCourt(p: Lieu): string {
  const r = regionParId(p.region);
  if (estRegionIvoirienne(p.region) && r) return r.chefLieu;
  return p.lieu ?? r?.chefLieu ?? p.region;
}

/** Libellé complet, « Poro (Korhogo) » ou le lieu trouvé sur la carte. */
export function libelleZone(p: Lieu): string {
  const r = regionParId(p.region);
  if (estRegionIvoirienne(p.region) && r) return libelleRegion(r);
  return p.lieu ?? r?.nom ?? p.region;
}
