export type Region = "Poro (Korhogo)" | "Gbêkê (Bouaké)";
export type Eau = "pluie" | "irrigation";
export type Materiel = "daba" | "traction" | "tracteur";

export type Parcelle = {
  region: Region;
  surface: number;
  cultures: string[];
  eau: Eau;
  priorites: string[];
  materiel: Materiel;
};

export const CULTURES = ["Maïs", "Coton", "Igname", "Manioc", "Arachide", "Riz", "Sorgho", "Niébé"] as const;

export const PRIORITES = [
  "Rendre mon sol plus fertile",
  "Garder un bon revenu",
  "Utiliser moins d'eau",
  "Résister aux sécheresses",
  "Nourrir mon bétail (fourrage)",
  "Limiter l'érosion de mon champ",
  "Vendre facilement au marché local",
] as const;

export const DEFAULT_PARCELLE: Parcelle = {
  region: "Poro (Korhogo)",
  surface: 2,
  cultures: ["Maïs", "Coton"],
  eau: "pluie",
  priorites: ["Rendre mon sol plus fertile", "Garder un bon revenu", "Nourrir mon bétail (fourrage)"],
  materiel: "traction",
};

export function validateParcelle(p: Parcelle): { ok: boolean; erreurs: string[] } {
  const erreurs: string[] = [];
  if (!Number.isFinite(p.surface) || p.surface <= 0) erreurs.push("La surface doit être supérieure à 0.");
  if (p.cultures.length === 0) erreurs.push("Choisissez au moins une culture.");
  if (p.priorites.length === 0) erreurs.push("Choisissez au moins une priorité.");
  return { ok: erreurs.length === 0, erreurs };
}
