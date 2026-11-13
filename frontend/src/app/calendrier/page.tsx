import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { BottomNav } from "@/components/BottomNav";
import { CalendrierVue } from "@/components/CalendrierVue";
import { getClimat, getCultures } from "@/lib/data";

export const metadata = { title: "Calendrier agricole — ForoSat" };

export default async function CalendrierPage() {
  const [climat, cultures] = await Promise.all([getClimat(), getCultures()]);
  return (
    <>
      <ParcelleHeader current="tableau" />
      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 pb-28 pt-8 md:pb-14">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Calendrier agricole</span>
          <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">De la préparation du sol à la récolte</h1>
          <p className="m-0 text-[17px] leading-normal text-muted">Les étapes de votre culture, datées selon votre région, votre saison des pluies et votre date de semis.</p>
        </div>
        <RequireParcelle>
          <CalendrierVue initial={climat} cultures={cultures} />
        </RequireParcelle>
      </main>
      <BottomNav current="tableau" />
    </>
  );
}
