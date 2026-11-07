import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { ClimatVue } from "@/components/ClimatVue";
import { BottomNav } from "@/components/BottomNav";
import { getClimat } from "@/lib/data";

export const metadata = { title: "Profil climatique — ForoSat" };

export default async function ClimatPage() {
  const climat = await getClimat();
  return (
    <>
      <ParcelleHeader current="climat" />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-[22px] px-6 pb-28 pt-8 md:pb-14">
        <RequireParcelle>
          <ClimatVue initial={climat} />
        </RequireParcelle>
      </main>
      <BottomNav current="climat" />
    </>
  );
}
