import type { AnalysePhoto } from "@/lib/ia/vision";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export type Comparaison = { verdict: "concordent" | "divergent" | "satellite_indisponible"; raisons: string[] };

/** Photo et satellite concordent-ils ? Règles écrites ; en cas de désaccord, les raisons possibles, sans trancher. */
export function comparer(a: AnalysePhoto, ndvi: number | null, _normale: number | null, mois?: string): Comparaison {
  if (ndvi === null) return { verdict: "satellite_indisponible", raisons: ["Image satellite indisponible pour ces derniers mois."] };
  const dense = ndvi >= 0.5 && a.couvertureSol >= 60;
  const nu = ndvi < 0.3 && a.couvertureSol < 30;
  if (dense || nu) return { verdict: "concordent", raisons: [] };
  const [an, m] = (mois ?? "").split("-").map(Number);
  return {
    verdict: "divergent",
    raisons: [
      "Le pixel satellite (environ 1 km) voit aussi les champs voisins.",
      mois ? `L'image satellite date de ${MOIS[m - 1]} ${an}, pas du jour de la photo.` : "L'image satellite ne date pas du jour de la photo.",
      "Des nuages ont pu masquer le sol sur l'image satellite.",
    ],
  };
}
