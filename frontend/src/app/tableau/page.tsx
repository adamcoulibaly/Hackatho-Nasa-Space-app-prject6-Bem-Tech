import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { TableauVue } from "@/components/TableauVue";
import { BottomNav } from "@/components/BottomNav";
import { getClimat, getCultures } from "@/lib/data";

export const metadata = { title: "Tableau de bord — ForoSat" };

export default async function TableauPage() {
  const [climat, cultures] = await Promise.all([getClimat(), getCultures()]);
  return (
    <>
      <ParcelleHeader current="tableau" />
      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 pb-28 pt-6 md:pb-14">
        <RequireParcelle>
          <TableauVue initial={climat} cultures={cultures} />
        </RequireParcelle>
      </main>
      <BottomNav current="tableau" />
    </>
  );
}
