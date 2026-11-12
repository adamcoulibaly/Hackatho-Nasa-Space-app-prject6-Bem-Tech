/**
 * Risque climatique agricole d'une région.
 * - Aujourd'hui : part des saisons réelles perdues (une saison difficile compte pour moitié), moyenne des 8 cultures.
 * - Vers 2050 : estimation = pertes d'aujourd'hui + baisse moyenne de la part des bonnes saisons prévue par les modèles
 *   (SSP5-8.5, 2041–2060 face à 1995–2014). Approximation : elle ajoute deux grandeurs proches, pas identiques.
 * Seuils écrits : faible < 10 %, moyen < 25 %, élevé au-delà.
 */
import type { Projections, Saisons } from "@/lib/contract";
import type { Niveau } from "./alertes";

export type RisqueRegion = { actuel: number; tendance2050: number | null; pertes2050: number; niveau: Niveau; niveau2050: Niveau };

const moyenne = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
const niveauDe = (pertes: number): Niveau => (pertes < 0.1 ? "faible" : pertes < 0.25 ? "moyen" : "eleve");

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
  const pertes2050 = Math.min(1, Math.max(0, actuel - (tendance2050 ?? 0)));
  return { actuel, tendance2050, pertes2050, niveau: niveauDe(actuel), niveau2050: niveauDe(pertes2050) };
}
