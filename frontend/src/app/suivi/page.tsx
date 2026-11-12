import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { BottomNav } from "@/components/BottomNav";
import { CarnetVue } from "@/components/CarnetVue";

export const metadata = { title: "Carnet de suivi — ForoSat" };

export default function SuiviPage() {
  return (
    <>
      <ParcelleHeader current="tableau" />
      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 pb-28 pt-8 md:pb-14">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Carnet de suivi</span>
          <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">Ce que vous voyez dans votre champ</h1>
          <p className="m-0 text-[17px] leading-normal text-muted">Notez l&apos;état de vos cultures au fil de la saison. ForoSat compare chaque observation à ce que les saisons réelles laissaient prévoir.</p>
        </div>
        <RequireParcelle>
          <CarnetVue />
        </RequireParcelle>
      </main>
      <BottomNav current="champ" />
    </>
  );
}
