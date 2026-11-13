/**
 * Stratégies selon les moyens de l'agriculteur, parmi les mêmes rotations candidates que le moteur :
 * - économique : peu d'intrants achetés et peu de travail du sol ;
 * - équilibrée : la rotation conseillée par le moteur (vos priorités) ;
 * - rendement : le meilleur rendement estimé sur les saisons réelles (FAO-33), revenu en appoint (hypothèse).
 * Pas de prix : les coûts sont décrits par les besoins en intrants, à valider par l'agronome.
 */
import type { Climat, Culture, Saisons } from "@/lib/contract";
import type { Parcelle } from "@/lib/parcelle/validate";
import { calculerRotations, candidats, rotationConseillee } from "./rotations";
import { rejouer } from "./rejeu";

export type StrategieId = "economique" | "equilibree" | "rendement";
export type Strategie = { id: StrategieId; titre: string; sequence: string[]; rendementMoyen?: number; pourquoi: string; contraintes: string[]; conseillee: boolean };

const moyenne = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const cle = (s: Culture[]) => s.map((c) => c.nom).join(",");

function contraintes(seq: Culture[], p: Parcelle): string[] {
  const out: string[] = [];
  const gourmandes = seq.filter((c) => c.intrants >= 4).map((c) => c.nom.toLowerCase());
  if (gourmandes.length) out.push(`Engrais et semences à acheter pour ${gourmandes.join(" et ")}.`);
  const lourdes = seq.filter((c) => c.travailSol >= 4).map((c) => c.nom.toLowerCase());
  if (lourdes.length) out.push(`Travail du sol important (buttes, labour) pour ${lourdes.join(" et ")}${p.materiel === "daba" ? " : difficile à la daba" : ""}.`);
  const eau = seq.filter((c) => c.eauMm[1] >= 1000).map((c) => c.nom.toLowerCase());
  if (eau.length && p.eau === "pluie") out.push(`Besoin en eau élevé pour ${eau.join(" et ")} sans irrigation.`);
  if (seq.some((c) => c.legumineuse)) out.push("La légumineuse enrichit le sol en azote : moins d'engrais pour la culture suivante.");
  if (!out.length) out.push("Peu de contraintes particulières.");
  return out;
}

export function strategies(p: Parcelle, climat: Climat, cultures: Culture[], saisons: Saisons | null): Strategie[] | null {
  const rotations = calculerRotations(p, climat, cultures, saisons);
  if (!rotations) return null;
  const parNom = new Map(cultures.map((c) => [c.nom, c]));
  const ky = Object.fromEntries(cultures.map((c) => [c.nom, c.ky.valeur]));
  const rendement = (seq: Culture[]) => (saisons ? rejouer(seq.map((c) => c.nom), saisons, ky).rendementMoyen : undefined);
  const tous = candidats(cultures);

  const econ = [...tous]
    .filter((s) => !(p.materiel === "daba" && s.some((c) => c.travailSol >= 4)))
    .map((s) => ({ s, score: (5 - moyenne(s.map((c) => c.intrants))) * 2 + (5 - moyenne(s.map((c) => c.travailSol))) + (rendement(s) ?? 0) / 100 }))
    .sort((a, b) => b.score - a.score || cle(a.s).localeCompare(cle(b.s)))[0].s;
  const rend = [...tous]
    .map((s) => ({ s, score: (rendement(s) ?? 0) + moyenne(s.map((c) => c.revenu)) }))
    .sort((a, b) => b.score - a.score || cle(a.s).localeCompare(cle(b.s)))[0].s;
  const equi = rotationConseillee(rotations).sequence.map((n) => parNom.get(n)).filter((c): c is Culture => !!c);

  const conseil: StrategieId = p.moyens === "faibles" ? "economique" : p.moyens === "bons" ? "rendement" : "equilibree";
  const faire = (id: StrategieId, titre: string, seq: Culture[], pourquoi: string): Strategie => ({
    id, titre, sequence: seq.map((c) => c.nom), rendementMoyen: rendement(seq), pourquoi, contraintes: contraintes(seq, p), conseillee: id === conseil,
  });
  return [
    faire("economique", "Économique", econ, "Peu d'engrais et de semences à acheter, peu de travail du sol : le moins de dépenses possible."),
    faire("equilibree", "Équilibrée", equi, "La rotation conseillée pour vos priorités : un compromis entre sol, eau et revenu."),
    faire("rendement", "Orientée rendement", rend, "Le meilleur rendement estimé sur les saisons réelles de votre région, si vous pouvez financer les intrants."),
  ];
}
