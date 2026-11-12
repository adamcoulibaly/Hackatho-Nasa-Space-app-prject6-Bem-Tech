import type { Rejeu, Saisons } from "@/lib/contract";

const PREMIERE_ANNEE = 2005;
const ORDRE = { perdue: 0, difficile: 1, bonne: 2 } as const;

/**
 * Rejoue une rotation sur les saisons réelles : l'année a, on sème la culture d'indice (a − 2005) modulo la longueur
 * de la rotation. Une année absente de la table de cette culture (données insuffisantes, cycle hors série) est ignorée.
 */
/** Rendement relatif FAO-33 en % du potentiel : 100 × (1 − Ky × (1 − ratio)), borné à 0 ; pas de semis = 0. */
export function rendementRelatif(ratio: number | null, ky: number): number {
  if (ratio === null) return 0;
  return Math.round(Math.max(0, 1 - ky * (1 - Math.min(1, ratio))) * 100);
}

export function rejouer(sequence: string[], saisons: Saisons, ky?: Record<string, number>): Rejeu {
  const annees = new Set(Object.values(saisons.cultures).flatMap((v) => v.map((x) => x.annee)));
  const ordre = [...annees].sort((a, b) => a - b);
  const jouees: Rejeu["saisons"] = [];
  for (const annee of ordre) {
    const culture = sequence[(((annee - PREMIERE_ANNEE) % sequence.length) + sequence.length) % sequence.length];
    const v = saisons.cultures[culture]?.find((x) => x.annee === annee);
    if (v) jouees.push({ ...v, culture, ...(ky?.[culture] ? { rendement: rendementRelatif(v.ratio, ky[culture]) } : {}) });
  }
  const compte = (k: keyof typeof ORDRE) => jouees.filter((x) => x.verdict === k).length;
  const mauvaises = jouees
    .filter((x) => x.verdict !== "bonne")
    .sort((a, b) => ORDRE[a.verdict] - ORDRE[b.verdict] || (a.ratio ?? -1) - (b.ratio ?? -1));
  const rendements = jouees.map((x) => x.rendement).filter((x): x is number => x !== undefined);
  return {
    saisons: jouees,
    bonnes: compte("bonne"),
    difficiles: compte("difficile"),
    perdues: compte("perdue"),
    total: jouees.length,
    pire: mauvaises[0] ?? null,
    ...(rendements.length && rendements.length === jouees.length ? { rendementMoyen: Math.round(rendements.reduce((a, b) => a + b, 0) / rendements.length) } : {}),
  };
}
