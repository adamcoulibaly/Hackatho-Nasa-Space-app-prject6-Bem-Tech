import { notFound } from "next/navigation";
import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { BottomNav } from "@/components/BottomNav";
import { RotationDetail } from "@/components/RotationDetail";
import { getClimat, getCultures } from "@/lib/data";

const IDS = ["A", "B", "C"] as const;
export const dynamicParams = false;

export function generateStaticParams() {
  return IDS.map((id) => ({ id }));
}

export default async function RotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(IDS as readonly string[]).includes(id)) notFound();
  const [climat, cultures] = await Promise.all([getClimat(), getCultures()]);
  return (
    <>
      <ParcelleHeader current="rotations" />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-[22px] px-6 pb-28 pt-8 md:pb-14">
        <RequireParcelle>
          <RotationDetail id={id as (typeof IDS)[number]} initial={climat} cultures={cultures} />
        </RequireParcelle>
      </main>
      <BottomNav current="rotations" />
    </>
  );
}
