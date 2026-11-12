import { SiteHeader } from "@/components/SiteHeader";
import { BottomNav } from "@/components/BottomNav";
import { RisquesVue } from "@/components/RisquesVue";
import type { RisqueAffiche } from "@/components/ListeRisques";
import { getProjections, getSaisons } from "@/lib/data";
import { REGIONS } from "@/lib/regions";
import { risqueRegion } from "@/lib/moteur/risques";

export const metadata = { title: "Carte des risques climatiques — ForoSat" };

export default async function RisquesPage() {
  const regions: RisqueAffiche[] = await Promise.all(
    REGIONS.map(async (r) => {
      const [s, p] = await Promise.all([getSaisons(r.id), getProjections(r.id).catch(() => null)]);
      return { id: r.id, nom: r.nom, chefLieu: r.chefLieu, lat: r.lat, lon: r.lon, ...risqueRegion(s, p) };
    }),
  );
  return (
    <>
      <SiteHeader current="risques" bottomNav />
      <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-6 pb-28 pt-8 md:pb-14">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Carte des risques</span>
          <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">Où le climat menace le plus les récoltes</h1>
          <p className="m-0 max-w-[680px] text-[17px] leading-normal text-muted">
            Pour chaque région : la part des saisons perdues entre 2005 et 2025 (moyenne des 8 cultures, une saison difficile comptant pour moitié), et une estimation vers 2050 : les pertes d&apos;aujourd&apos;hui plus la baisse des bonnes saisons prévue par les modèles dans le scénario pessimiste.
          </p>
        </div>
        <RisquesVue regions={regions} />
        <p className="m-0 text-xs leading-normal text-muted">
          Sources : NASA POWER (journalier, 2005–2025), bilan d&apos;eau FAO-56 ; NASA NEX-GDDP-CMIP6 (3 modèles, SSP5-8.5, 2041–2060 comparé à 1995–2014). Mesure au chef-lieu de chaque région ; seuils écrits, à valider par l&apos;agronome. Le risque ne tient compte que du manque d&apos;eau, pas des inondations.
        </p>
      </main>
      <BottomNav current="climat" />
    </>
  );
}
