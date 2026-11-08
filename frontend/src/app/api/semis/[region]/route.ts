import { NextResponse } from "next/server";
import { getClimatRegion } from "@/lib/data";
import { etatSemisRegion } from "@/lib/semis";
import { regionParId } from "@/lib/regions";

// Données NASA POWER des derniers jours, gardées 6 h en cache.
export const revalidate = 21600;

export async function GET(_req: Request, { params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  if (!regionParId(region)) return NextResponse.json({ erreur: `Région « ${region} » inconnue.` }, { status: 404 });
  const climat = await getClimatRegion(region);
  const r = await etatSemisRegion(region, { fetch, aujourdhui: new Date(), climat });
  return NextResponse.json(r.corps, { status: r.statut });
}
