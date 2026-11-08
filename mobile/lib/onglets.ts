/** Liaison entre les onglets natifs : une page d'un onglet peut en ouvrir une autre dans son propre onglet. */

export const ONGLETS = ["tableau", "climat", "rotations", "champ"] as const;
export type Onglet = (typeof ONGLETS)[number];

export function estOnglet(v: unknown): v is Onglet {
  return typeof v === "string" && (ONGLETS as readonly string[]).includes(v);
}

/** Chemin interne du site (un seul « / » au début) : rien d'autre n'est transmis à une page. */
export function estCheminInterne(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && v.length <= 600;
}

type Aller = (chemin: string) => void;
const enAttente = new Map<Onglet, string>();
const pages = new Map<Onglet, Aller>();

/** Une page d'onglet s'inscrit : les demandes pour cet onglet lui arrivent directement. */
export function inscrirePage(onglet: Onglet, aller: Aller): () => void {
  pages.set(onglet, aller);
  return () => {
    if (pages.get(onglet) === aller) pages.delete(onglet);
  };
}

/** Chemin demandé pour un onglet pas encore ouvert : lu une fois, au premier affichage de l'onglet. */
export function prendreCheminEnAttente(onglet: Onglet): string | undefined {
  const c = enAttente.get(onglet);
  enAttente.delete(onglet);
  return c;
}

/** Demande que l'onglet affiche ce chemin (page déjà ouverte : elle y va ; sinon au premier affichage). */
export function demanderChemin(onglet: Onglet, chemin: string): void {
  const aller = pages.get(onglet);
  if (aller) aller(chemin);
  else enAttente.set(onglet, chemin);
}
