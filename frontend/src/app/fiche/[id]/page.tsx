import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { FicheDepuisUrl } from "@/components/FicheDepuisUrl";
import { getClimat, getCultures } from "@/lib/data";

const IDS = ["A", "B", "C"] as const;
export const dynamicParams = false;

export function generateStaticParams() {
  return IDS.map((id) => ({ id }));
}

export default async function FichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(IDS as readonly string[]).includes(id)) notFound();
  const [climat, cultures] = await Promise.all([getClimat(), getCultures()]);
  return (
    <>
      <SiteHeader current="rotations" />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-5 px-4 pb-14 pt-8">
        <Suspense fallback={<div aria-busy="true" className="min-h-[200px]" />}>
          <FicheDepuisUrl id={id as (typeof IDS)[number]} initial={climat} cultures={cultures} />
        </Suspense>
      </main>
    </>
  );
}
