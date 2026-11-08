import { NextResponse } from "next/server";
import { DataError, getProjections } from "@/lib/data";
import { REGIONS } from "@/lib/regions";

// Un fichier JSON par région, généré au build : aucune lecture à l'exécution.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return REGIONS.map((r) => ({ region: r.id }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  try {
    return NextResponse.json(await getProjections(region));
  } catch (e) {
    // Données absentes pour cette région : la page masque la section et le signale comme lacune, le build continue.
    if (e instanceof DataError) return NextResponse.json({ erreur: e.message }, { status: 404 });
    throw e;
  }
}
