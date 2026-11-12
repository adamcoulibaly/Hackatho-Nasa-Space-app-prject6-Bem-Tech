/**
 * Risque climatique agricole d'une région : part des saisons réelles perdues (une saison difficile compte pour moitié),
 * moyenne des 8 cultures, aggravée ou allégée par l'évolution pessimiste (SSP5-8.5) prévue vers 2050 par les modèles.
 * Seuils écrits : faible < 10 %, moyen < 25 %, élevé au-delà.
 */
import type { Projections, Saisons } from "@/lib/contract";
import type { Niveau } from "./alertes";

export type RisqueRegion = { actuel: number; tendance2050: number | null; score: number; niveau: Niveau };

const moyenne = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);

export function risqueRegion(s: Saisons, p: Projections | null): RisqueRegion {
  const parCulture = Object.values(s.cultures)
    .filter((v) => v.length)
    .map((v) => moyenne(v.map((x) => (x.verdict === "perdue" ? 1 : x.verdict === "difficile" ? 0.5 : 0))));
  const actuel = moyenne(parCulture);
  const ecarts = p
    ? Object.values(p.cultures).flatMap((c) =>
        Object.values(c.ssp585)
          .filter((m) => m.reference != null && m.futur != null)
          .map((m) => (m.futur as number) - (m.reference as number)),
      )
    : [];
  const tendance2050 = p && ecarts.length ? moyenne(ecarts) : null;
  const score = Math.max(0, actuel - (tendance2050 ?? 0));
  return { actuel, tendance2050, score, niveau: score < 0.1 ? "faible" : score < 0.25 ? "moyen" : "eleve" };
}
