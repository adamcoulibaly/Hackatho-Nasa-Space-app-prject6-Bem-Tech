import { SiteHeader } from "@/components/SiteHeader";
import { ParcelleView } from "@/components/ParcelleView";
import { BottomNav } from "@/components/BottomNav";
import { getCouches } from "@/lib/data";

export const metadata = { title: "Ma parcelle — ForoSat" };

export default async function ParcellePage() {
  const couches = await getCouches();
  return (
    <>
      <SiteHeader current="parcelle" bottomNav />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-6 px-6 pb-28 pt-8 md:pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Étape 1 sur 3</span>
            <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">
              Où se trouve <span className="font-serif font-normal italic text-orange-dark">votre champ ?</span>
            </h1>
          </div>
          <div className="flex w-[220px] gap-1.5" aria-hidden="true">
            <div className="h-1.5 flex-grow rounded-[3px] bg-orange" />
            <div className="h-1.5 flex-grow rounded-[3px] bg-[#DDE3DC]" />
            <div className="h-1.5 flex-grow rounded-[3px] bg-[#DDE3DC]" />
          </div>
        </div>
        <ParcelleView couches={couches} />
      </main>
      <BottomNav current="champ" />
    </>
  );
}
