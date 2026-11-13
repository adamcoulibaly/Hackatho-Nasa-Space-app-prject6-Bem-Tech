import { SiteHeader } from "@/components/SiteHeader";
import { BottomNav } from "@/components/BottomNav";
import { Traduire } from "@/components/Traduire";

export const metadata = { title: "Traduire ForoSat — ForoSat" };

export default function TraduirePage() {
  return (
    <>
      <SiteHeader bottomNav />
      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 pb-28 pt-8 md:pb-14">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Langues locales</span>
          <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">Aidez-nous à traduire ForoSat</h1>
          <p className="m-0 text-[17px] leading-normal text-muted">Dioula, baoulé, sénoufo… ForoSat sera traduit avec les agriculteurs qui parlent ces langues, phrase par phrase.</p>
        </div>
        <Traduire />
      </main>
      <BottomNav current="tableau" />
    </>
  );
}
