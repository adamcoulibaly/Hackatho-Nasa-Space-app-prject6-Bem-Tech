import type { RisqueRegion } from "@/lib/moteur/risques";

export type RisqueAffiche = RisqueRegion & { id: string; nom: string; chefLieu: string; lat: number; lon: number };
export type Horizon = "aujourdhui" | "2050";

export const COULEUR_RISQUE = { faible: "#009E60", moyen: "#F77F00", eleve: "#C2410C" } as const;
export const LIBELLE_RISQUE = { faible: "Risque faible", moyen: "Risque moyen", eleve: "Risque élevé" } as const;

const pct = (x: number) => `${Math.round(x * 100)} %`;
/** Évolution en points de bonnes saisons (négatif = moins de bonnes saisons). */
const points = (x: number) => {
  // Arrondi symétrique : −1,5 point s'affiche −2, comme +1,5 s'affiche +2.
  const n = Math.sign(x) * Math.round(Math.abs(x * 100));
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)} point${Math.abs(n) > 1 ? "s" : ""}`;
};

export const niveauSelon = (r: RisqueRegion, h: Horizon) => (h === "2050" ? r.niveau2050 : r.niveau);

/** Les régions, de la plus exposée à la moins exposée : version lisible et accessible de la carte. */
export function ListeRisques({ regions, horizon = "aujourdhui" }: { regions: RisqueAffiche[]; horizon?: Horizon }) {
  const valeur = (r: RisqueAffiche) => (horizon === "2050" ? r.pertes2050 : r.actuel);
  const tri = [...regions].sort((a, b) => valeur(b) - valeur(a));
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {tri.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3.5">
          <span className="flex min-w-0 flex-col gap-0.5">
            <strong className="text-[15px]">{r.nom.startsWith("District") ? r.nom : `${r.nom} (${r.chefLieu})`}</strong>
            <span className="text-sm text-muted">
              {horizon === "2050"
                ? `${pct(r.pertes2050)} de saisons perdues estimées vers 2050 (${pct(r.actuel)} aujourd'hui)`
                : `${pct(r.actuel)} de saisons perdues aujourd'hui`}
              {horizon === "aujourdhui" && r.tendance2050 !== null && ` · ${points(r.tendance2050)} de bonnes saisons vers 2050`}
            </span>
          </span>
          <span className="rounded-full px-3 py-1 text-[13px] font-bold text-white" style={{ background: COULEUR_RISQUE[niveauSelon(r, horizon)] }}>{LIBELLE_RISQUE[niveauSelon(r, horizon)]}</span>
        </li>
      ))}
    </ol>
  );
}
