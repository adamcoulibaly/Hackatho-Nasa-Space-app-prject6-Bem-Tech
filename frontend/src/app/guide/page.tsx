import { SiteHeader } from "@/components/SiteHeader";
import { BottomNav } from "@/components/BottomNav";
import { GuideEtapes } from "@/components/GuideEtapes";

export const metadata = { title: "Guide d'utilisation — ForoSat" };

export default function GuidePage() {
  return (
    <>
      <SiteHeader bottomNav />
      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 pb-28 pt-8 md:pb-14">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Guide d&apos;utilisation</span>
          <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">ForoSat en sept étapes</h1>
          <p className="m-0 text-[17px] leading-normal text-muted">Pas besoin d&apos;être expert : suivez les étapes dans l&apos;ordre la première fois, puis revenez à celle dont vous avez besoin.</p>
        </div>
        <GuideEtapes />
      </main>
      <BottomNav current="tableau" />
    </>
  );
}
