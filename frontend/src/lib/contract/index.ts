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
  /** Pluie GPM IMERG (satellites) recoupée avec la pluie NASA POWER, sur les mêmes mois. */
  imerg: z
    .object({
      pluieMensuelle: z.array(z.number().nonnegative()).length(12),
      pluieMensuellePower: z.array(z.number().nonnegative()).length(12),
      annuel: z.number().nonnegative(),
      annuelPower: z.number().nonnegative(),
      ecartPct: z.number().int(),
      correlation: z.number().min(-1).max(1).nullable(),
      accord: z.enum(["bon", "moyen", "faible"]),
      mois: z.number().int().positive(),
      periode: z.string(),
      source: z.string(),
    })
    .optional(),
  /** Stress thermique et évapotranspiration ECOSTRESS au point agricole de la région (passages clairs). */
  ecostress: z
    .object({
      lst: z.array(z.number().nullable()).length(12),
      et: z.array(z.number().nullable()).length(12),
      passages: z.number().int().nonnegative(),
      joursChauds: z.number().min(0).max(1).nullable(),
      seuil: z.number(),
      periode: z.string(),
      source: z.string(),
      point: z.string(),
    })
    .optional(),
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
    /** Dernier jour mesuré (AAAA-MM-JJ). */
    dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    tuiles: z.array(z.object({ label: z.string(), valeur: z.string(), source: z.string(), niveau: z.enum(["alerte", "ok", "neutre"]) })).min(1),
    extras: z.array(z.object({ label: z.string(), valeur: z.string(), accent: z.boolean().optional() })),
  }).optional(),
});
export type Climat = z.infer<typeof ClimatSchema>;

/* ---------- rotations ---------- */
/** Verdict d'une saison réelle pour une culture (data/saisons/<region>.json, moteur FAO-56 du pipeline). */
export const VerdictSaisonSchema = z.object({
  annee: z.number().int(),
  verdict: z.enum(["bonne", "difficile", "perdue"]),
  semis: z.string().nullable(),
  ratio: z.number().nullable(),
  cause: z.string(),
});
export type VerdictSaison = z.infer<typeof VerdictSaisonSchema>;

export const SaisonsSchema = z.object({
  meta: z.object({
    region: z.string(),
    source: z.string(),
    periode: z.string(),
    saison: z.object({ debut: mois, fin: mois }),
    reserveMm: z.number().positive(),
    /** Pluie cumulée de la saison principale, par année (mm). */
    pluieSaison: z.record(z.string(), z.number()).optional(),
  }),
  cultures: z.record(z.string(), z.array(VerdictSaisonSchema)),
});
export type Saisons = z.infer<typeof SaisonsSchema>;

const SaisonRejoueeSchema = VerdictSaisonSchema.extend({
  culture: z.string(),
  /** Rendement relatif estimé, en % du potentiel (FAO-33) ; absent sans coefficient Ky. */
  rendement: z.number().min(0).max(100).optional(),
});
/** Rotation rejouée sur les saisons réelles : la culture de l'année N de la rotation, chaque saison. */
export const RejeuSchema = z.object({
  saisons: z.array(SaisonRejoueeSchema),
  bonnes: z.number().int(),
  difficiles: z.number().int(),
  perdues: z.number().int(),
  total: z.number().int(),
  pire: SaisonRejoueeSchema.nullable(),
  /** Moyenne des rendements relatifs des saisons rejouées, en % du potentiel. */
  rendementMoyen: z.number().min(0).max(100).optional(),
});
export type Rejeu = z.infer<typeof RejeuSchema>;

const PartsModeleSchema = z.object({
  reference: z.number().nullable(),
  /** Horizon 2050 (2041–2060). */
  futur: z.number().nullable(),
  futur2030: z.number().nullable().optional(),
  futur2040: z.number().nullable().optional(),
});
/** Projections 2050 (data/projections/<region>.json) : part des bonnes saisons par culture, scénario et modèle. */
export const ProjectionsSchema = z.object({
  meta: z.object({
    region: z.string(),
    source: z.string(),
    modeles: z.array(z.string()).min(1),
    scenarios: z.object({ ssp245: z.string(), ssp585: z.string() }),
    reference: z.string(),
    futur: z.string(),
    horizons: z.record(z.string(), z.string()).optional(),
  }),
  cultures: z.record(z.string(), z.object({ ssp245: z.record(z.string(), PartsModeleSchema), ssp585: z.record(z.string(), PartsModeleSchema) })),
});
export type Projections = z.infer<typeof ProjectionsSchema>;

const FourchetteSchema = z.object({ min: z.number().int(), max: z.number().int(), desaccord: z.boolean() });
/** Bonnes saisons d'une rotation aujourd'hui (rejeu réel) et vers 2050 (fourchette des modèles), sur le même nombre de saisons. */
const ParScenarioSchema = z.object({ ssp245: FourchetteSchema, ssp585: FourchetteSchema });
export const ProjectionSchema = z.object({
  aujourdhui: z.number().int(),
  total: z.number().int(),
  /** Horizon 2050. */
  scenarios: ParScenarioSchema,
  /** Horizons disponibles : 2030 (2021–2040), 2040 (2031–2050), 2050 (2041–2060). */
  horizons: z.object({ "2030": ParScenarioSchema, "2040": ParScenarioSchema, "2050": ParScenarioSchema }).partial().optional(),
});
export type Projection = z.infer<typeof ProjectionSchema>;

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
  rejeu: RejeuSchema.optional(),
  projection: ProjectionSchema.optional(),
  /** Rotation dont le minimum pessimiste vers 2050 est le plus haut (une seule). */
  tient2050: z.literal(true).optional(),
});
export type Rotation = z.infer<typeof RotationSchema>;

/* ---------- couches de la carte (tuiles NASA GIBS, sans clé) ---------- */
export const CoucheSchema = z.object({
  id: z.enum(["couleurs", "veg", "chaleur", "sol", "pluie"]),
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
  /** Guide de lecture pour l'agriculteur : ce que mesure la couche, sa finesse, ses couleurs, ce que ça veut dire pour le champ. */
  guide: z
    .object({
      mesure: z.string(),
      finesse: z.string(),
      lecture: z.array(z.object({ couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/), sens: z.string() })).min(1),
      pourVotreChamp: z.string(),
    })
    .optional(),
});
export type Couche = z.infer<typeof CoucheSchema>;
export type CoucheId = Couche["id"];
export const CouchesSchema = z.array(CoucheSchema).min(1);

/* ---------- méthode ---------- */
export const SourcesSchema = z.object({
  etapes: z.array(z.object({ titre: z.string(), texte: z.string() })).min(1),
  sources: z
    .array(z.object({ nom: z.string(), mesure: z.string(), finesse: z.string(), finesseClasse: z.enum(["fine", "moyenne", "grossiere"]), usage: z.string(), priorite: z.enum(["Utilisé", "Prochaine étape"]) }))
    .min(1),
  approches: z
    .array(z.object({ id: z.string(), nom: z.string(), role: z.string(), verdict: z.enum(["Retenu", "Testé", "Prévu", "Écarté"]), explicabilite: niveau, besoinDonnees: niveau, precision: niveau, description: z.string() }))
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
  famille: z.enum(["poacées", "fabacées", "malvacées", "dioscoréacées", "euphorbiacées", "solanacées", "convolvulacées", "pédaliacées", "astéracées"]),
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
  /** Stades FAO-56 : durées de référence (initial, développement, mi-saison, fin) en jours, ramenées à cycleJours au calcul, et Kc (initial, mi-saison, fin). */
  stades: z.object({
    jours: z.tuple([z.number().int().positive(), z.number().int().positive(), z.number().int().positive(), z.number().int().positive()]),
    kc: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]),
    source: z.string(),
  }),
  /** Coefficient de réponse du rendement à l'eau (FAO-33) : perte relative = Ky × (1 − eau reçue / eau demandée). */
  ky: z.object({ valeur: z.number().positive(), source: z.string() }),
  /** Besoin en intrants achetés (engrais, semences, traitements), de 1 (faible) à 5 (élevé) : estimation à valider. */
  intrants: niveau,
  /** Culture de saison fraîche : semée quand la température maximale moyenne du mois passe sous ce seuil (°C), pas aux premières pluies. */
  semisFrais: z.number().optional(),
});
export type Culture = z.infer<typeof CultureSchema>;
export const CulturesSchema = z.array(CultureSchema).min(8);
