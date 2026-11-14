/** Rappels de saison reçus de la page : validation et dates (sans module natif, testable). */
import { estCheminInterne, estOnglet, type Onglet } from "./onglets";

export type RappelSaison = { id: string; date: string; titre: string; texte: string; chemin: string; onglet: Onglet };

export function lireListeRappels(v: unknown): RappelSaison[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (r): r is RappelSaison =>
        !!r &&
        typeof r.id === "string" && /^[a-z0-9-]{1,30}$/.test(r.id) &&
        typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        typeof r.titre === "string" && r.titre.length > 0 && r.titre.length <= 80 &&
        typeof r.texte === "string" && r.texte.length > 0 && r.texte.length <= 300 &&
        estCheminInterne(r.chemin) && estOnglet(r.onglet),
    )
    .slice(0, 20)
    .map(({ id, date, titre, texte, chemin, onglet }) => ({ id, date, titre, texte, chemin, onglet }));
}

/** Moment où le rappel sonne : 8 h du matin, heure du téléphone. */
export function quand(date: string): Date {
  const [a, m, j] = date.split("-").map(Number);
  return new Date(a, m - 1, j, 8, 0, 0);
}

export function prochainRappel(liste: RappelSaison[], maintenant = new Date()): string | undefined {
  return liste.filter((r) => quand(r.date) > maintenant).map((r) => r.date).sort()[0];
}
