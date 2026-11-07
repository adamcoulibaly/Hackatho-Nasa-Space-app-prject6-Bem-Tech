import Link from "next/link";
import { notFound } from "next/navigation";
import { Fiche } from "@/components/Fiche";
import { ShareActions } from "@/components/ShareActions";
import { SiteHeader } from "@/components/SiteHeader";
import { getRotation, getRotations } from "@/lib/data";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getRotations()).map((r) => ({ id: r.id }));
}

export default async function FichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rotation = await getRotation(id);
  if (!rotation) notFound();
  return (
    <>
      <SiteHeader current="rotations" />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-5 px-4 pb-14 pt-8">
        <Link href={`/rotations/${rotation.id}`} className="no-print inline-flex min-h-[44px] items-center text-sm font-semibold">← Détail de la rotation {rotation.id}</Link>
        <Fiche rotation={rotation} />
        <ShareActions rotation={rotation} />
      </main>
    </>
  );
}
