import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { BottomNav } from "@/components/BottomNav";
import { SimulateurVue } from "@/components/SimulateurVue";
import { getClimat, getCultures } from "@/lib/data";

export const metadata = { title: "Simulateur — ForoSat" };

export default async function SimulateurPage() {
  const [climat, cultures] = await Promise.all([getClimat(), getCultures()]);
  return (
    <>
      <ParcelleHeader current="simulateur" />
      <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-6 pb-28 pt-8 md:pb-14">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Simulateur</span>
          <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">Vos rotations dans le temps</h1>
          <p className="m-0 max-w-[640px] text-[17px] leading-normal text-muted">Comparez les trois rotations sur 3, 5 ou 10 ans, en climat réel, en année sèche ou en année très pluvieuse, avant de choisir.</p>
        </div>
        <RequireParcelle>
          <SimulateurVue initial={climat} cultures={cultures} />
        </RequireParcelle>
      </main>
      <BottomNav current="rotations" />
    </>
  );
}
