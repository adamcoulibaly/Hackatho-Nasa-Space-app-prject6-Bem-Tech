/** Carnet de suivi de la parcelle : les observations de l'agriculteur, gardées sur le téléphone seulement. */
import { z } from "zod";
import type { Saisons } from "@/lib/contract";

const CLE = "forosat.carnet";
const MAX = 200;

export const ObservationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  culture: z.string().min(1).max(40),
  etat: z.enum(["bonne", "moyenne", "mauvaise"]),
  pluie: z.enum(["assez", "trop", "pas_assez"]),
  note: z.string().max(280),
  /** « suivi » (état du champ) ou « recolte » (résultat réel de la saison). */
  type: z.enum(["suivi", "recolte"]).optional(),
  recolte: z.enum(["bonne", "moyenne", "faible", "nulle"]).optional(),
  /** Habitude ForoSat figée au moment de l'observation : la comparaison ne change pas si les données changent. */
  prevision: z.object({ part: z.number().min(0).max(1), bonnes: z.number().int(), total: z.number().int() }).optional(),
});
export type Observation = z.infer<typeof ObservationSchema>;
export type ObservationEnregistree = Observation & { id: string };

export function lireCarnet(): ObservationEnregistree[] {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE) ?? "[]");
    const v = z.array(ObservationSchema.extend({ id: z.string() })).safeParse(brut);
    return v.success ? [...v.data].sort((a, b) => b.date.localeCompare(a.date)) : [];
  } catch {
    return [];
  }
}

function ecrire(c: ObservationEnregistree[]) {
  try {
    localStorage.setItem(CLE, JSON.stringify(c.slice(0, MAX)));
  } catch {
    /* stockage indisponible : le carnet reste en mémoire pour cette visite */
  }
}

/** Part des bonnes saisons 2005–2025 pour une culture, ou undefined sans fiche. */
function habitude(culture: string, s: Saisons | null | undefined): Observation["prevision"] {
  const liste = s?.cultures[culture];
  if (!liste?.length) return undefined;
  const bonnes = liste.filter((x) => x.verdict === "bonne").length;
  return { part: bonnes / liste.length, bonnes, total: liste.length };
}

export function ajouterObservation(o: Observation, s?: Saisons | null): ObservationEnregistree {
  const v = ObservationSchema.parse({ ...o, prevision: o.prevision ?? habitude(o.culture, s) });
  const nouvelle = { ...v, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` };
  ecrire([nouvelle, ...lireCarnet()].sort((a, b) => b.date.localeCompare(a.date)));
  return nouvelle;
}

export function supprimerObservation(id: string) {
  ecrire(lireCarnet().filter((o) => o.id !== id));
}

/** Ce que les saisons réelles laissaient prévoir pour cette culture, et si l'observation s'en écarte nettement. */
export function comparerObservation(o: Observation, s: Saisons | null): { attendu: string; ecart: boolean } {
  // Référence : la fréquence des bonnes saisons 2005–2025 (figée à l'observation), pas une prévision de l'année en cours.
  const h = o.prevision ?? habitude(o.culture, s);
  if (!h) return { attendu: "Pas de prévision ForoSat pour cette culture (pas encore de fiche).", ecart: false };
  const { bonnes, part } = h;
  const liste = { length: h.total };
  const attendu =
    part >= 0.6
      ? `En général (2005–2025), cette culture a plutôt de bonnes saisons ici : ${bonnes} sur ${liste.length}.`
      : part < 0.4
        ? `En général (2005–2025), cette culture a souvent des saisons difficiles ici : ${bonnes} bonnes sur ${liste.length}.`
        : `En général (2005–2025), les saisons de cette culture sont incertaines ici : ${bonnes} bonnes sur ${liste.length}.`;
  const mauvais = o.type === "recolte" ? o.recolte === "faible" || o.recolte === "nulle" : o.etat === "mauvaise";
  const bon = o.type === "recolte" ? o.recolte === "bonne" : o.etat === "bonne";
  const ecart = (mauvais && part >= 0.6) || (bon && part < 0.4);
  return { attendu, ecart };
}

/** Prévisions face à la réalité : sur toutes les observations comparables, combien concordent avec l'habitude ForoSat. */
export function bilanCarnet(carnet: Observation[], s: Saisons | null): { total: number; concordent: number } {
  const comparables = carnet.filter((o) => o.prevision ?? s?.cultures[o.culture]?.length);
  return { total: comparables.length, concordent: comparables.filter((o) => !comparerObservation(o, s).ecart).length };
}
