import { z } from "zod";

export const CRITERES = ["fertilite", "eau", "secheresse", "revenu", "erosion", "fourrage", "marche"] as const;
export type CritereId = (typeof CRITERES)[number];

export const CRITERE_LABELS: Record<CritereId, string> = {
  fertilite: "Fertilité du sol",
  eau: "Économie d'eau",
  secheresse: "Sécheresse",
  revenu: "Revenu",
  erosion: "Anti-érosion",
  fourrage: "Fourrage",
  marche: "Marché local",
};

const niveau = z.number().int().min(1).max(5);
const mois = z.number().int().min(1).max(12);

/* ---------- climat ---------- */
export const ClimatSchema = z.object({
  indicateurs: z.array(z.object({ label: z.string(), valeur: z.string(), source: z.string(), accent: z.boolean().optional() })).min(1),
  pluieMensuelle: z.array(z.number().nonnegative()).length(12),
  saisonPluies: z.object({ debut: mois, fin: mois }),
  matrice: z
    .array(
      z.object({
        label: z.string(),
        source: z.string(),
        palette: z.enum(["eau", "chaud", "veg"]),
        valeurs: z.array(z.number().int().min(0).max(4)).length(12),
      }),
    )
    .min(1),
  grace: z.array(z.object({ annee: z.number().int(), ecart: z.number().nullable() })).min(2),
  alertes: z.array(z.object({ type: z.enum(["surveiller", "favorable"]), titre: z.string(), texte: z.string() })).min(1),
});
export type Climat = z.infer<typeof ClimatSchema>;

/* ---------- rotations ---------- */
export const RotationSchema = z.object({
  id: z.enum(["A", "B", "C"]),
  tag: z.string(),
  recommandee: z.boolean(),
  sequence: z.array(z.string()).min(2).max(3),
  scores: z.object({
    fertilite: niveau, eau: niveau, secheresse: niveau, revenu: niveau, erosion: niveau, fourrage: niveau, marche: niveau,
  }),
  note: z.string(),
  pourquoi: z.array(z.string()).min(1),
  donnees: z.array(z.object({ source: z.string(), texte: z.string() })).min(1),
  risques: z.array(z.string()),
  lacune: z.string().min(1),
  confiance: z.object({
    niveau: z.enum(["faible", "moyenne", "élevée"]),
    facteurs: z.object({ accordSources: niveau, finesse: niveau, historique: niveau, verification: niveau }),
  }),
  calendrier: z
    .array(z.object({ annee: z.number().int().min(1).max(3), culture: z.string(), type: z.enum(["culture", "couverture", "sol_nu"]), debutMois: mois, finMois: mois }))
    .min(1),
});
export type Rotation = z.infer<typeof RotationSchema>;
export const RotationsSchema = z.array(RotationSchema).length(3);

/* ---------- couches de la carte ---------- */
export const CoucheSchema = z.object({
  id: z.enum(["veg", "eau", "ero", "tend"]),
  label: z.string(),
  source: z.string(),
  echelle: z.string(),
  palette: z.array(z.string()).length(8),
  motif: z.object({ fx: z.number(), fy: z.number() }),
});
export type Couche = z.infer<typeof CoucheSchema>;
export type CoucheId = Couche["id"];
export const CouchesSchema = z.array(CoucheSchema).length(4);

/* ---------- méthode ---------- */
export const SourcesSchema = z.object({
  etapes: z.array(z.object({ titre: z.string(), texte: z.string() })).min(1),
  sources: z
    .array(z.object({ nom: z.string(), mesure: z.string(), finesse: z.string(), finesseClasse: z.enum(["fine", "moyenne", "grossiere"]), usage: z.string(), priorite: z.enum(["MVP", "Bonus"]) }))
    .min(1),
  approches: z
    .array(z.object({ id: z.string(), nom: z.string(), role: z.string(), verdict: z.enum(["Retenu", "Testé", "Écarté"]), explicabilite: niveau, besoinDonnees: niveau, precision: niveau, description: z.string() }))
    .min(1),
  humainDecide: z.array(z.string()).min(1),
});
export type Sources = z.infer<typeof SourcesSchema>;

/* ---------- lexique ---------- */
export const TermeSchema = z.object({ terme: z.string(), tag: z.string(), definition: z.string(), pourquoi: z.string() });
export type Terme = z.infer<typeof TermeSchema>;
export const LexiqueSchema = z.array(TermeSchema).min(1);
