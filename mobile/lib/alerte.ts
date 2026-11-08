/** Alerte « semez maintenant » : quand notifier, et quoi dire (logique pure, testée hors de l'app). */

export type EtatSemis = { etat: string; depuis?: string };

const DECLENCHEURS = ["fenetre_ouverte", "poche_seche"];

/** Vrai seulement au passage vers une fenêtre ouverte ou une poche sèche, jamais deux fois pour le même événement. */
export function decider(precedent: EtatSemis | null, actuel: EtatSemis): boolean {
  if (!DECLENCHEURS.includes(actuel.etat)) return false;
  return !precedent || precedent.etat !== actuel.etat || precedent.depuis !== actuel.depuis;
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
