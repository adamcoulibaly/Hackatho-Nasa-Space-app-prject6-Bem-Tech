import { z } from "zod";
import { regionParId } from "@/lib/regions";
import { CATALOGUE, CULTURES_CI } from "@/lib/monde/pays";

export type Eau = "pluie" | "irrigation";
export type Materiel = "daba" | "traction" | "tracteur";

export type Parcelle = {
  /** Région ivoirienne, ou point du monde « pt_<lat>_<lon> » (voir lib/regions et lib/monde/lieu). */
  region: string;
  /** Pays de la parcelle (code ISO à 2 lettres, ex. « SN ») ; absent = Côte d'Ivoire. */
  pays?: string;
  /** Nom du lieu (village, ville) trouvé sur la carte, pour l'afficher à la place des coordonnées. */
  lieu?: string;
  surface: number;
  cultures: string[];
  eau: Eau;
  priorites: string[];
  materiel: Materiel;
  /** Contour dessiné sur la carte, en [latitude, longitude]. Reste sur l'appareil. */
  contour?: [number, number][];
  centre?: [number, number];
  /** Culture hors des 8 fiches (« Autre ») : gardée et affichée, non évaluée. Undefined = non cochée. */
  autreCulture?: string;
  /** Objectif hors liste (« Autre ») : gardé et affiché, sans poids dans le score. */
  autreObjectif?: string;
  /** Moyens pour acheter des intrants (engrais, semences, traitements). */
  moyens?: "faibles" | "moyens" | "bons";
  /** Pente du contour dessiné (altitude SRTM) ; `cle` identifie le contour mesuré. */
  pente?: PenteParcelle;
};

export type PenteParcelle = {
  moyenne: number;
  forte: number;
  altitudeMin: number;
  altitudeMax: number;
  classe: "faible" | "modere" | "fort" | "tres-fort";
  cle: string;
};

/** Longueur maximale d'une saisie « Autre ». */
export const AUTRE_MAX = 40;

/** Les 8 cultures de la Côte d'Ivoire ; le catalogue mondial est dans lib/monde/pays. */
export const CULTURES = CULTURES_CI;
export { CATALOGUE };

export const PRIORITES = [
  "Rendre mon sol plus fertile",
  "Garder un bon revenu",
  "Utiliser moins d'eau",
  "Résister aux sécheresses",
  "Nourrir mon bétail (fourrage)",
  "Limiter l'érosion de mon champ",
  "Vendre facilement au marché local",
] as const;

/** La rotation actuelle compte 3 cultures au plus, dans l'ordre où elles se suivent. */
export const MAX_CULTURES = 3;

export const DEFAULT_PARCELLE: Parcelle = {
  region: "poro",
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
  if (p.cultures.length + (p.autreCulture !== undefined ? 1 : 0) > MAX_CULTURES) erreurs.push("Choisissez 3 cultures au plus.");
  if (p.autreCulture !== undefined && !p.autreCulture.trim()) erreurs.push("Précisez l'autre culture.");
  if (p.priorites.length === 0 && !p.autreObjectif?.trim()) erreurs.push("Choisissez au moins une priorité.");
  if (p.autreObjectif !== undefined && !p.autreObjectif.trim()) erreurs.push("Précisez l'autre objectif.");
  return { ok: erreurs.length === 0, erreurs };
}

/** Forme attendue d'une parcelle relue depuis le stockage local. */
export const ParcelleSchema = z.object({
  region: z.string().refine((id) => !!regionParId(id), "Région inconnue"),
  pays: z.string().regex(/^[A-Z]{2}$/).optional(),
  lieu: z.string().max(80).optional(),
  surface: z.number(),
  cultures: z.array(z.string()),
  eau: z.enum(["pluie", "irrigation"]),
  priorites: z.array(z.string()),
  materiel: z.enum(["daba", "traction", "tracteur"]),
  contour: z.array(z.tuple([z.number(), z.number()])).optional(),
  centre: z.tuple([z.number(), z.number()]).optional(),
  autreCulture: z.string().max(AUTRE_MAX).optional(),
  autreObjectif: z.string().max(AUTRE_MAX).optional(),
  moyens: z.enum(["faibles", "moyens", "bons"]).optional(),
  pente: z
    .object({
      moyenne: z.number().nonnegative(),
      forte: z.number().nonnegative(),
      altitudeMin: z.number(),
      altitudeMax: z.number(),
      classe: z.enum(["faible", "modere", "fort", "tres-fort"]),
      cle: z.string().max(64),
    })
    .optional(),
});
