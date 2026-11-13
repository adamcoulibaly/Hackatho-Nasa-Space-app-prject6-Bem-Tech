import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { AujourdhuiVue } from "@/components/AujourdhuiVue";
import { BottomNav } from "@/components/BottomNav";
import { getClimat, getCultures } from "@/lib/data";

export const metadata = { title: "Ma parcelle aujourd'hui — ForoSat" };

export default async function AujourdhuiPage() {
  const [climat, cultures] = await Promise.all([getClimat(), getCultures()]);
  return (
    <>
      <ParcelleHeader current="tableau" />
      <main className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 pb-28 pt-6 md:pb-14">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Ma parcelle aujourd&apos;hui</span>
          <h1 className="m-0 font-display text-[clamp(28px,3.2vw,42px)] font-bold leading-[1.05] tracking-[-0.04em]">Tout ce que ForoSat sait de votre champ, en un écran</h1>
        </div>
        <RequireParcelle>
          <AujourdhuiVue initial={climat} cultures={cultures} />
        </RequireParcelle>
      </main>
      <BottomNav current="tableau" />
    </>
  );
}
