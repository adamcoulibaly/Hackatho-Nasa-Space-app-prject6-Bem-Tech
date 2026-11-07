import { z } from "zod";

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
  /** Contour dessiné sur la carte, en [latitude, longitude]. Reste sur l'appareil. */
  contour?: [number, number][];
  centre?: [number, number];
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

/** Forme attendue d'une parcelle relue depuis le stockage local. */
export const ParcelleSchema = z.object({
  region: z.enum(["Poro (Korhogo)", "Gbêkê (Bouaké)"]),
  surface: z.number(),
  cultures: z.array(z.string()),
  eau: z.enum(["pluie", "irrigation"]),
  priorites: z.array(z.string()),
  materiel: z.enum(["daba", "traction", "tracteur"]),
  contour: z.array(z.tuple([z.number(), z.number()])).optional(),
  centre: z.tuple([z.number(), z.number()]).optional(),
});
