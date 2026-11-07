import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { Tableau } from "@/components/Tableau";
import { BottomNav } from "@/components/BottomNav";
import { getClimat, getRotations } from "@/lib/data";

export const metadata = { title: "Tableau de bord — ForoSat" };

export default async function TableauPage() {
  const [climat, rotations] = await Promise.all([getClimat(), getRotations()]);
  const reco = rotations.find((r) => r.recommandee) ?? rotations[0];
  return (
    <>
      <ParcelleHeader current="tableau" />
      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 pb-28 pt-6 md:pb-14">
        <RequireParcelle>
          <Tableau climat={climat} reco={reco} />
        </RequireParcelle>
      </main>
      <BottomNav current="tableau" />
    </>
  );
}
