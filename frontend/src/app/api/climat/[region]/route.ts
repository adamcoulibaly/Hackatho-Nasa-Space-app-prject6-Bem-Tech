import { NextResponse } from "next/server";
import { getClimatRegion } from "@/lib/data";
import { REGIONS } from "@/lib/regions";

// Un fichier JSON par région, généré au build : aucune lecture à l'exécution.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return REGIONS.map((r) => ({ region: r.id }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  return NextResponse.json(await getClimatRegion(region));
}
