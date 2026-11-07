import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { BottomNav } from "@/components/BottomNav";
import { RotationsVue } from "@/components/RotationsVue";
import { getClimat, getCultures } from "@/lib/data";

export const metadata = { title: "Comparer les rotations — ForoSat" };

export default async function RotationsPage() {
  const [climat, cultures] = await Promise.all([getClimat(), getCultures()]);
  return (
    <>
      <ParcelleHeader current="rotations" />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-6 px-6 pb-28 pt-8 md:pb-14">
        <RequireParcelle>
          <RotationsVue initial={climat} cultures={cultures} />
        </RequireParcelle>
      </main>
      <BottomNav current="rotations" />
    </>
  );
}
