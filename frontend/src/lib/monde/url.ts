import { estPoint } from "./lieu";

/**
 * Adresse des données d'une zone : régions ivoiriennes → /api/<donnée>/<région> (fichiers générés au build) ;
 * points du monde → /api/monde/<donnée>/<point> (calcul à la demande). null : donnée inexistante pour ce point.
 */
export function urlDonnee(chemin: string, region: string): string | null {
  if (!estPoint(region)) return `/api/${chemin}/${region}`;
  if (chemin === "climat" || chemin === "saisons") return `/api/monde/${chemin}/${region}`;
  if (chemin === "semis") return `/api/semis/${region}`;
  return null; // projections 2050 : Côte d'Ivoire seulement pour l'instant
}
