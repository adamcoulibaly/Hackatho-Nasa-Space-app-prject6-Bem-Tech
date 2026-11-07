import type { CritereId, Culture } from "@/lib/contract";
import type { Parcelle } from "@/lib/parcelle/validate";
import type { ClimatResume } from "./climat";

export type Note = 1 | 2 | 3 | 4 | 5;
export type Notes = Record<CritereId, Note>;

const borne = (n: number): Note => Math.min(5, Math.max(1, Math.round(n))) as Note;
const moyenne = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** Priorité du formulaire → critère qu'elle renforce. */
export const PRIORITE_CRITERE: Record<string, CritereId> = {
  "Rendre mon sol plus fertile": "fertilite",
  "Garder un bon revenu": "revenu",
  "Utiliser moins d'eau": "eau",
  "Résister aux sécheresses": "secheresse",
  "Nourrir mon bétail (fourrage)": "fourrage",
  "Limiter l'érosion de mon champ": "erosion",
  "Vendre facilement au marché local": "marche",
};

/** Mois de culture dépassant la saison des pluies (0 si la culture y tient). */
export function moisHorsSaison(c: Culture, cl: ClimatResume): number {
  return Math.max(0, Math.ceil(c.cycleJours / 30) - cl.moisSaison);
}

/**
 * Besoin en eau de la culture rapporté à la pluie de la saison : plus il est faible, meilleure est la note.
 * Sans irrigation, une culture qui dépasse la saison des pluies de plus d'un mois perd 1 point, de plus de 3 mois 2 points.
 */
export function noteEauCulture(c: Culture, cl: ClimatResume, eau: Parcelle["eau"]): Note {
  return borne(eauBrute(c, cl, eau));
}

/** Même règle que noteEauCulture, sans arrondi ni plancher à 1 (de 0 à 5) : sert au classement. */
function eauBrute(c: Culture, cl: ClimatResume, eau: Parcelle["eau"]): number {
  const r = c.eauMm[1] / Math.max(1, cl.pluieSaisonMm);
  let n = r <= 0.5 ? 5 : r <= 0.7 ? 4 : r <= 0.9 ? 3 : r <= 1.1 ? 2 : 1;
  if (eau === "irrigation") n += 1;
  else {
    const hors = moisHorsSaison(c, cl);
    if (hors > 1) n -= 1;
    if (hors > 3) n -= 1;
  }
  return Math.max(0, Math.min(5, n));
}

/** Notes affichées : arrondies de 1 à 5. */
export function notesRotation(seq: Culture[], cl: ClimatResume, eau: Parcelle["eau"]): Notes {
  const b = notesBrutes(seq, cl, eau);
  return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, borne(v)])) as Notes;
}

/** Notes non arrondies (0 à 5) : le classement les utilise pour ne pas perdre les écarts entre régions. */
export function notesBrutes(seq: Culture[], cl: ClimatResume, eau: Parcelle["eau"]): Record<CritereId, number> {
  const manque = eau === "pluie" && seq.some((c) => c.eauMm[0] > cl.pluieSaisonMm);
  const legumineuses = seq.filter((c) => c.legumineuse).length;
  const alternance = seq.length > 1 && seq.every((c, i) => i === 0 || c.famille !== seq[i - 1].famille);
  const lim = (n: number) => Math.max(0, Math.min(5, n));
  return {
    eau: lim(moyenne(seq.map((c) => eauBrute(c, cl, eau)))),
    secheresse: lim(moyenne(seq.map((c) => c.secheresse)) - (manque ? 1 : 0)),
    fertilite: lim(2 + Math.min(2, legumineuses) + (alternance ? 1 : 0)),
    erosion: moyenne(seq.map((c) => c.couverture)),
    fourrage: moyenne(seq.map((c) => c.fourrage)),
    revenu: moyenne(seq.map((c) => c.revenu)),
    marche: moyenne(seq.map((c) => c.marche)),
  };
}

/** Moyenne des notes, chaque critère choisi en priorité pesant 3, les autres 1. */
export function scorePondere(notes: Readonly<Record<CritereId, number>>, priorites: string[]): number {
  const choisis = new Set(priorites.map((p) => PRIORITE_CRITERE[p]).filter(Boolean));
  let somme = 0;
  let poids = 0;
  for (const [k, v] of Object.entries(notes) as [CritereId, number][]) {
    const w = choisis.has(k) ? 3 : 1;
    somme += w * v;
    poids += w;
  }
  return somme / poids;
}
