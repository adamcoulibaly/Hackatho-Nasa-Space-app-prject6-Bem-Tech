import type { Climat, Culture } from "@/lib/contract";
import type { Parcelle } from "@/lib/parcelle/validate";
import { extraireClimat, type ClimatResume } from "./climat";
import { notesBrutes, notesRotation, scorePondere, type Notes } from "./notes";

export type Choix = { id: "A" | "B" | "C"; sequence: string[]; cultures: Culture[]; scores: Notes; score: number };

const PENALITE_DABA = 0.5;

function evaluer(seq: Culture[], p: Parcelle, cl: ClimatResume): { scores: Notes; score: number } {
  const scores = notesRotation(seq, cl, p.eau);
  const lourd = p.materiel === "daba" && seq.some((c) => c.travailSol >= 4);
  return { scores, score: scorePondere(notesBrutes(seq, cl, p.eau), p.priorites) - (lourd ? PENALITE_DABA : 0) };
}

/** Suites de 3 cultures distinctes, sans même famille d'affilée (cycle compris : 3e → 1re), avec au moins une légumineuse. */
function candidats(cultures: Culture[]): Culture[][] {
  const out: Culture[][] = [];
  for (const a of cultures)
    for (const b of cultures)
      for (const c of cultures) {
        const s = [a, b, c];
        if (new Set(s).size < 3) continue;
        if (a.famille === b.famille || b.famille === c.famille || c.famille === a.famille) continue;
        if (!s.some((x) => x.legumineuse)) continue;
        out.push(s);
      }
  return out;
}

const cle = (s: Culture[]) => s.map((c) => c.nom).join(" → ");
/** Cultures de `a` absentes de `b`. */
const nouvelles = (a: Culture[], b: Culture[]) => a.filter((c) => !b.includes(c)).length;

/** Rotation actuelle (A) et deux alternatives (B, C), ou null si aucune culture n'est saisie. */
export function choisirRotations(p: Parcelle, climat: Climat, cultures: Culture[]): Choix[] | null {
  const parNom = new Map(cultures.map((c) => [c.nom, c]));
  const actuelle = p.cultures.map((n) => parNom.get(n)).filter((c): c is Culture => !!c).slice(0, 3);
  if (actuelle.length === 0) return null;
  const cl = extraireClimat(climat);

  const classes = candidats(cultures)
    .filter((s) => cle(s) !== cle(actuelle))
    .map((s) => ({ s, ...evaluer(s, p, cl) }))
    .sort((x, y) => y.score - x.score || cle(x.s).localeCompare(cle(y.s), "fr"));
  const b = classes[0];
  const c = classes.find((x) => nouvelles(x.s, b.s) >= 2)!;
  const a = { s: actuelle, ...evaluer(actuelle, p, cl) };

  return ([["A", a], ["B", b], ["C", c]] as const).map(([id, x]) => ({ id, sequence: x.s.map((k) => k.nom), cultures: x.s, scores: x.scores, score: x.score }));
}

export const calculerRotations = choisirRotations;
