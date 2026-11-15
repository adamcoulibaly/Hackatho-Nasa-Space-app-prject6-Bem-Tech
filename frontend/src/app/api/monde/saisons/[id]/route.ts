import { NextResponse } from "next/server";
import { getCultures } from "@/lib/data";
import { climatPoint, PowerIndisponible, saisonsPoint } from "@/lib/monde/serveur";

// 21 saisons réelles (2005–2025) rejouées à la demande pour un point du monde, toutes cultures du catalogue.
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const CACHE = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const climat = await climatPoint(id);
    if (!climat) return NextResponse.json({ erreur: `Lieu « ${id} » inconnu.` }, { status: 404 });
    return NextResponse.json(await saisonsPoint(id, await getCultures(), climat), { headers: CACHE });
  } catch (e) {
    if (e instanceof PowerIndisponible) return NextResponse.json({ erreur: "Données NASA POWER indisponibles pour le moment." }, { status: 503 });
    throw e;
  }
}
