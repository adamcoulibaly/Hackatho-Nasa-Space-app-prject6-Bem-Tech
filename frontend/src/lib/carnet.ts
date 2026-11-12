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

export function ajouterObservation(o: Observation): ObservationEnregistree {
  const v = ObservationSchema.parse(o);
  const nouvelle = { ...v, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` };
  ecrire([nouvelle, ...lireCarnet()].sort((a, b) => b.date.localeCompare(a.date)));
  return nouvelle;
}

export function supprimerObservation(id: string) {
  ecrire(lireCarnet().filter((o) => o.id !== id));
}

/** Ce que les saisons réelles laissaient prévoir pour cette culture, et si l'observation s'en écarte nettement. */
export function comparerObservation(o: Observation, s: Saisons | null): { attendu: string; ecart: boolean } {
  const liste = s?.cultures[o.culture];
  if (!liste?.length) return { attendu: "Pas de prévision ForoSat pour cette culture (pas encore de fiche).", ecart: false };
  const bonnes = liste.filter((x) => x.verdict === "bonne").length;
  const part = bonnes / liste.length;
  const attendu =
    part >= 0.6
      ? `ForoSat prévoyait plutôt une bonne saison (${bonnes} sur ${liste.length} en moyenne).`
      : part < 0.4
        ? `ForoSat prévoyait une saison difficile (${bonnes} bonnes sur ${liste.length}).`
        : `ForoSat prévoyait une saison incertaine (${bonnes} bonnes sur ${liste.length}).`;
  const ecart = (o.etat === "mauvaise" && part >= 0.6) || (o.etat === "bonne" && part < 0.4);
  return { attendu, ecart };
}
