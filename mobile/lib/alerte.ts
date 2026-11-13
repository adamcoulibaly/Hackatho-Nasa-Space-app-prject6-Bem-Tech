/** Alerte « semez maintenant » : quand notifier, et quoi dire (logique pure, testée hors de l'app). */

export type EtatSemis = { etat: string; depuis?: string; cle?: string };

const DECLENCHEURS = ["fenetre_ouverte", "poche_seche"];
const MEMOIRE = 10;

/** Identifiant d'un événement d'alerte : un état dans une saison (année et mois de début). */
export const cleAlerte = (e: EtatSemis) => `${e.etat}|${e.cle}`;

/**
 * Vrai pour une fenêtre ouverte ou une poche sèche pas encore annoncée dans cette saison :
 * au plus une alerte par état et par saison, même si plusieurs orages se succèdent.
 */
export function decider(dejaAnnonces: string[], actuel: EtatSemis): boolean {
  if (!DECLENCHEURS.includes(actuel.etat) || !actuel.cle) return false;
  return !dejaAnnonces.includes(cleAlerte(actuel));
}

/** Ajoute un événement annoncé en ne gardant que les plus récents. */
export function memoriser(dejaAnnonces: string[], cle: string): string[] {
  return [...dejaAnnonces.filter((c) => c !== cle), cle].slice(-MEMOIRE);
}

/** Nom lisible d'une région à partir de son identifiant (« san-pedro » → « San Pedro »). */
const nomRegion = (id: string) => id.split("-").map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(" ");

const article = (culture: string) => {
  const c = culture.toLowerCase();
  return /^[aeiouyéèêàâîïôûh]/.test(c) ? `l'${c}` : `le ${c}`;
};

export function texteAlerte(region: string, culture: string | null, etat: string): { titre: string; corps: string } {
  const r = nomRegion(region);
  if (etat === "poche_seche") return { titre: "Poche sèche", corps: `${r} : poche sèche en cours, attendez avant de semer.` };
  return {
    titre: "C'est le moment de semer",
    corps: `${r} : les pluies sont installées. C'est le moment de semer${culture ? ` ${article(culture)}` : ""}.`,
  };
}

export type AlerteMeteo = { type: "secheresse" | "fortes_pluies" | "chaleur"; niveau: "moyen" | "eleve"; depuis: string; message: string; conseil: string };

/** Dernière notification envoyée pour chaque type d'alerte météo (date AAAA-MM-JJ). */
export type DerniersMeteo = Partial<Record<AlerteMeteo["type"], string>>;
const DELAI_JOURS = 7;
const joursEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * Alertes météo à notifier : au plus une par type tous les 7 jours. Un même orage recalculé sur 3 jours,
 * ou une sécheresse qui dure, ne renvoie donc pas de notification chaque jour.
 */
export function alertesANotifier(derniers: DerniersMeteo, alertes: AlerteMeteo[] | undefined, aujourdhui: string): AlerteMeteo[] {
  return (alertes ?? []).filter((a) => {
    const d = derniers[a.type];
    return !d || joursEntre(d, aujourdhui) >= DELAI_JOURS;
  });
}

export function noterMeteo(derniers: DerniersMeteo, notifiees: AlerteMeteo[], aujourdhui: string): DerniersMeteo {
  return { ...derniers, ...Object.fromEntries(notifiees.map((a) => [a.type, aujourdhui])) };
}

const TITRE_METEO = { secheresse: "Alerte sécheresse", fortes_pluies: "Alerte fortes pluies", chaleur: "Alerte chaleur" } as const;
const NIVEAU = { moyen: "risque moyen", eleve: "risque élevé" } as const;

export function texteMeteo(region: string, a: AlerteMeteo): { titre: string; corps: string } {
  return { titre: `${TITRE_METEO[a.type]} · ${NIVEAU[a.niveau]}`, corps: `${nomRegion(region)} : ${a.message} ${a.conseil}` };
}

/** Texte demandé par la page pour la lecture à voix haute : une chaîne, sans espaces autour, 3000 caractères au plus. */
export function texteALire(t: unknown): string | null {
  if (typeof t !== "string" || !t.trim()) return null;
  return t.trim().slice(0, 3000);
}
