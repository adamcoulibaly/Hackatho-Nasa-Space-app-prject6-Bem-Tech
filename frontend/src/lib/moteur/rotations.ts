import type { Climat, Culture, Projections, Rotation, Saisons } from "@/lib/contract";
import { construireRotation } from "./explications";
import type { Parcelle } from "@/lib/parcelle/validate";
import { extraireClimat, type ClimatResume } from "./climat";
import { notesBrutes, notesRotation, scorePondere, type Notes } from "./notes";
import { rejouer } from "./rejeu";
import { choisirTient2050, projeter } from "./projection";

export type Choix = { id: "A" | "B" | "C"; sequence: string[]; cultures: Culture[]; scores: Notes; score: number };

const PENALITE_DABA = 0.5;

function evaluer(seq: Culture[], p: Parcelle, cl: ClimatResume, saisons?: Saisons | null): { scores: Notes; score: number } {
  const rejeu = saisons ? rejouer(seq.map((c) => c.nom), saisons) : undefined;
  const scores = notesRotation(seq, cl, p.eau, rejeu);
  const lourd = p.materiel === "daba" && seq.some((c) => c.travailSol >= 4);
  return { scores, score: scorePondere(notesBrutes(seq, cl, p.eau, rejeu), p.priorites) - (lourd ? PENALITE_DABA : 0) };
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
/** Ensemble des cultures, sans ordre : une alternative doit en changer au moins une. */
const ensemble = (s: Culture[]) => s.map((c) => c.nom).sort().join(",");
/** Cultures de `a` absentes de `b`. */
const nouvelles = (a: Culture[], b: Culture[]) => a.filter((c) => !b.includes(c)).length;

/** Rotation actuelle (A) et deux alternatives (B, C), ou null si aucune culture n'est saisie. */
export function choisirRotations(p: Parcelle, climat: Climat, cultures: Culture[], saisons?: Saisons | null): Choix[] | null {
  const parNom = new Map(cultures.map((c) => [c.nom, c]));
  const actuelle = p.cultures.map((n) => parNom.get(n)).filter((c): c is Culture => !!c).slice(0, 3);
  if (actuelle.length === 0) return null;
  const cl = extraireClimat(climat);

  const classes = candidats(cultures)
    .filter((s) => ensemble(s) !== ensemble(actuelle))
    .map((s) => ({ s, ...evaluer(s, p, cl, saisons) }))
    .sort((x, y) => y.score - x.score || cle(x.s).localeCompare(cle(y.s), "fr"));
  const b = classes[0];
  const c = classes.find((x) => nouvelles(x.s, b.s) >= 2)!;
  const a = { s: actuelle, ...evaluer(actuelle, p, cl, saisons) };

  return ([["A", a], ["B", b], ["C", c]] as const).map(([id, x]) => ({ id, sequence: x.s.map((k) => k.nom), cultures: x.s, scores: x.scores, score: x.score }));
}

export type RotationCalculee = Rotation & { score: number };

/**
 * Les 3 rotations complètes (A actuelle, B et C alternatives), ou null si aucune culture n'est saisie.
 * `saisons` : verdicts des saisons réelles de la région ; null si leur chargement a échoué (signalé comme lacune).
 */
export function calculerRotations(
  p: Parcelle,
  climat: Climat,
  cultures: Culture[],
  saisons?: Saisons | null,
  projections?: Projections | null,
): RotationCalculee[] | null {
  const choix = choisirRotations(p, climat, cultures, saisons);
  if (!choix) return null;
  const cl = extraireClimat(climat);
  const rotations = choix.map((ch) => {
    const rejeu = saisons ? rejouer(ch.sequence, saisons) : undefined;
    const projection = rejeu && projections ? projeter(ch.sequence, rejeu, projections) ?? undefined : undefined;
    const r = construireRotation(ch, { climat, cl, p, scoreActuelle: choix[0].score, rejeu, sansRejeu: saisons === null, sansProjections: projections === null });
    return projection ? { ...r, projection } : r;
  });
  const robuste = choisirTient2050(rotations);
  return rotations.map((r) => (r.id === robuste ? { ...r, tient2050: true as const } : r));
}

/** Rotation à mettre en avant : la recommandée, sinon l'actuelle (rien ne la bat pour ces priorités). */
export function rotationConseillee<T extends { recommandee: boolean }>(rotations: T[]): T {
  return rotations.find((r) => r.recommandee) ?? rotations[0];
}
