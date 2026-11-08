import type { Projection, Projections, Rejeu } from "@/lib/contract";

type Scenario = "ssp245" | "ssp585";
const SCENARIOS: Scenario[] = ["ssp245", "ssp585"];
const SEUIL_DESACCORD = 0.05;

/**
 * Bonnes saisons vers 2050 : pour chaque modèle, l'écart (futur − référence) moyen des cultures de la rotation est
 * appliqué à la part réelle des bonnes saisons (rejeu). Les défauts propres au modèle s'annulent ; seule son évolution compte.
 */
export function projeter(sequence: string[], rejeu: Rejeu, p: Projections): Projection | null {
  if (rejeu.total === 0) return null;
  const part = rejeu.bonnes / rejeu.total;
  const scenarios = {} as Projection["scenarios"];
  for (const s of SCENARIOS) {
    const ecarts = p.meta.modeles
      .map((m) => {
        const e = sequence
          .map((c) => p.cultures[c]?.[s]?.[m])
          .filter((x): x is { reference: number; futur: number } => x?.reference != null && x?.futur != null)
          .map((x) => x.futur - x.reference);
        return e.length ? e.reduce((a, b) => a + b, 0) / e.length : null;
      })
      .filter((e): e is number => e !== null);
    if (ecarts.length === 0) return null;
    const bonnes = ecarts.map((e) => Math.round(Math.min(1, Math.max(0, part + e)) * rejeu.total));
    scenarios[s] = {
      min: Math.min(...bonnes),
      max: Math.max(...bonnes),
      desaccord: ecarts.some((e) => e > SEUIL_DESACCORD) && ecarts.some((e) => e < -SEUIL_DESACCORD),
    };
  }
  return { aujourdhui: rejeu.bonnes, total: rejeu.total, scenarios };
}

type AvecProjection = { id: string; projection?: Projection };

/** Identifiant de la rotation la plus robuste vers 2050 (plus haut minimum pessimiste, puis plus haut maximum), ou null. */
export function choisirTient2050(rotations: AvecProjection[]): string | null {
  const avec = rotations.filter((r): r is Required<AvecProjection> => !!r.projection);
  if (avec.length === 0) return null;
  const meilleure = avec.reduce((a, b) => {
    const pa = a.projection.scenarios.ssp585;
    const pb = b.projection.scenarios.ssp585;
    return pb.min > pa.min || (pb.min === pa.min && pb.max > pa.max) ? b : a;
  });
  return meilleure.id;
}

const fourchette = (f: { min: number; max: number }) => (f.min === f.max ? `${f.min}` : `${f.min} à ${f.max}`);

/** Phrase de synthèse, calculée par règles, sur l'ensemble des rotations. */
export function phrase2050(rotations: (AvecProjection & { sequence: string[] })[]): string {
  const id = choisirTient2050(rotations);
  const r = rotations.find((x) => x.id === id);
  if (!r?.projection) return "Projections 2050 indisponibles pour cette région.";
  const f = r.projection.scenarios.ssp585;
  if (f.desaccord) {
    return `Pour la rotation ${r.id}, les modèles ne s'accordent pas : la pluie de 2050 reste très incertaine dans votre région (${fourchette(f)} bonnes saisons sur ${r.projection.total} selon le modèle, scénario pessimiste).`;
  }
  return `La rotation ${r.id} résiste le mieux au climat de 2050 : ${fourchette(f)} bonnes saisons sur ${r.projection.total} dans le scénario pessimiste, contre ${r.projection.aujourdhui} aujourd'hui.`;
}
