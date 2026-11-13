/**
 * Traduire ForoSat : faute de traductions vérifiées, ForoSat n'en invente aucune. Des locuteurs natifs proposent la
 * traduction des phrases clés ; l'équipe les fait relire par d'autres locuteurs avant de les intégrer.
 */
export const LANGUES = ["Dioula", "Baoulé", "Sénoufo", "Bété", "Agni", "Autre langue"] as const;

export const PHRASES = [
  { id: "bonne_saison", fr: "Bonne saison" },
  { id: "saison_difficile", fr: "Saison difficile" },
  { id: "saison_perdue", fr: "Saison perdue" },
  { id: "semez", fr: "La terre est assez humide : vous pouvez semer." },
  { id: "attendez", fr: "Attendez avant de semer : il n'a pas assez plu." },
  { id: "secheresse", fr: "Pas de pluie utile depuis plusieurs jours." },
  { id: "fortes_pluies", fr: "Fortes pluies : vérifiez le drainage." },
  { id: "chaleur", fr: "Forte chaleur : arrosez le matin et paillez le sol." },
  { id: "rotation", fr: "Rotation des cultures" },
  { id: "jachere", fr: "Laisser la terre se reposer (jachère)" },
  { id: "recolte", fr: "Récolte" },
  { id: "conseiller", fr: "Demandez l'avis d'un conseiller agricole." },
] as const;

export type Contribution = { langue: string; traductions: Record<string, string> };

export function texteContribution(langue: string, traductions: Record<string, string>): string {
  const lignes = PHRASES.filter((p) => traductions[p.id]?.trim()).map((p) => `• ${p.fr} → ${traductions[p.id].trim()}`);
  return [`ForoSat · Proposition de traduction en ${langue}`, ...lignes, "À faire relire par d'autres locuteurs avant intégration."].join("\n");
}

const CLE = "forosat.traduction";
export function lireBrouillon(): Contribution {
  try {
    const c = JSON.parse(localStorage.getItem(CLE) ?? "null");
    return c && typeof c.langue === "string" && c.traductions ? c : { langue: "", traductions: {} };
  } catch {
    return { langue: "", traductions: {} };
  }
}
export function garderBrouillon(c: Contribution) {
  try {
    localStorage.setItem(CLE, JSON.stringify(c));
  } catch {
    /* stockage indisponible */
  }
}
