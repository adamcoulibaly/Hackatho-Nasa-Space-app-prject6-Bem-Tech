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
  /** Toutes les saisons des pluies (le sud en a souvent deux). */
  saisons: z.array(z.object({ debut: mois, fin: mois })).min(1).optional(),
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
  /** Eau stockée (GRACE) : absente tant que le compte Earthdata n'est pas branché. */
  grace: z.array(z.object({ annee: z.number().int(), ecart: z.number().nullable() })).min(2).optional(),
  alertes: z.array(z.object({ type: z.enum(["surveiller", "favorable"]), titre: z.string(), texte: z.string() })).min(1),
  /** Un onglet par indicateur pour l'affichage téléphone (12 valeurs mensuelles). */
  onglets: z
    .array(
      z.object({
        id: z.enum(["pluie", "chaleur", "sol", "veg"]),
        label: z.string(),
        big: z.string(),
        source: z.string(),
        legende: z.string(),
        valeurs: z.array(z.number()).length(12),
        min: z.number().optional(),
        saison: z.boolean().optional(),
        conseil: z.string(),
      }),
    )
    .min(1),
  /** Provenance : les données réelles, leur source et leur période. */
  meta: z
    .object({
      reel: z.array(z.string()),
      source: z.string(),
      periode: z.string(),
      tendancePluie: z.string().optional(),
      region: z.string().optional(),
    })
    .optional(),
  /** État du moment, pour le tableau de bord. */
  actuel: z.object({
    saison: z.string(),
    titre: z.string(),
    accent: z.string(),
    texte: z.string(),
    moisCourant: mois,
    tuiles: z.array(z.object({ label: z.string(), valeur: z.string(), source: z.string(), niveau: z.enum(["alerte", "ok", "neutre"]) })).min(1),
    extras: z.array(z.object({ label: z.string(), valeur: z.string(), accent: z.boolean().optional() })),
  }).optional(),
});
export type Climat = z.infer<typeof ClimatSchema>;

/* ---------- rotations ---------- */
export const RotationSchema = z.object({
  id: z.enum(["A", "B", "C"]),
  tag: z.string(),
  recommandee: z.boolean(),
  sequence: z.array(z.string()).min(1).max(3),
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

/* ---------- couches de la carte (tuiles NASA GIBS, sans clé) ---------- */
export const CoucheSchema = z.object({
  id: z.enum(["couleurs", "veg", "chaleur", "sol"]),
  label: z.string(),
  source: z.string(),
  echelle: z.string(),
  gibs: z.object({
    couche: z.string(),
    format: z.enum(["png", "jpg"]),
    /** Zoom maximal des tuiles natives (GoogleMapsCompatible_LevelN). */
    niveau: z.number().int().min(1).max(12),
    /** Jour de l'année affiché, au format MM-JJ (ex. « 08-01 » pour août). */
    date: z.string().regex(/^\d{2}-\d{2}$/),
    /** Première année disponible. */
    depuis: z.number().int(),
  }),
  opacite: z.number().min(0).max(1),
});
export type Couche = z.infer<typeof CoucheSchema>;
export type CoucheId = Couche["id"];
export const CouchesSchema = z.array(CoucheSchema).min(1);

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

/* ---------- fiches cultures (knowledge/cultures.json) ---------- */
export const CultureSchema = z.object({
  nom: z.string(),
  famille: z.enum(["poacées", "fabacées", "malvacées", "dioscoréacées", "euphorbiacées"]),
  /** Durée typique du cycle, en jours. */
  cycleJours: z.number().int().positive(),
  /** Besoin en eau sur le cycle, en mm : [minimum, confortable]. */
  eauMm: z.tuple([z.number().positive(), z.number().positive()]),
  legumineuse: z.boolean(),
  secheresse: niveau,
  chaleur: niveau,
  couverture: niveau,
  fourrage: niveau,
  /** Exigence en travail du sol (5 = buttage, labour lourd). */
  travailSol: niveau,
  revenu: niveau,
  marche: niveau,
  sources: z.array(z.string()).min(1),
  /** Champs qui ne sont que des hypothèses. */
  hypotheses: z.array(z.enum(["revenu", "marche"])),
  aValider: z.literal(true),
});
export type Culture = z.infer<typeof CultureSchema>;
export const CulturesSchema = z.array(CultureSchema).length(8);
