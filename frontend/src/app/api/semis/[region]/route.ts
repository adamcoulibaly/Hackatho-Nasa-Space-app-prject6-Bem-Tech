import { NextResponse } from "next/server";
import { getClimatRegion } from "@/lib/data";
import { etatSemisRegion } from "@/lib/semis";
import { estRegionIvoirienne, regionParId } from "@/lib/regions";
import { climatPoint, PowerIndisponible } from "@/lib/monde/serveur";

// Données NASA POWER des derniers jours, gardées 6 h en cache.
export const revalidate = 21600;

export async function GET(_req: Request, { params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  if (!regionParId(region)) return NextResponse.json({ erreur: `Région « ${region} » inconnue.` }, { status: 404 });
  let climat;
  try {
    climat = estRegionIvoirienne(region) ? await getClimatRegion(region) : await climatPoint(region);
  } catch (e) {
    if (e instanceof PowerIndisponible) return NextResponse.json({ erreur: "Données NASA POWER indisponibles pour le moment." }, { status: 503 });
    throw e;
  }
  if (!climat) return NextResponse.json({ erreur: `Région « ${region} » inconnue.` }, { status: 404 });
  const r = await etatSemisRegion(region, { fetch, aujourdhui: new Date(), climat });
  return NextResponse.json(r.corps, { status: r.statut });
}
