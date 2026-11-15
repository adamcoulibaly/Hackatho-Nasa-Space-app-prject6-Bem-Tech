import { NextResponse } from "next/server";
import { climatPoint, PowerIndisponible } from "@/lib/monde/serveur";

// Climat d'un point du monde (« pt_<lat>_<lon> »), calculé à la demande depuis NASA POWER.
// Les régions ivoiriennes restent servies par /api/climat/<région> (fichiers générés au build).
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const CACHE = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const c = await climatPoint(id);
    return c ? NextResponse.json(c, { headers: CACHE }) : NextResponse.json({ erreur: `Lieu « ${id} » inconnu.` }, { status: 404 });
  } catch (e) {
    if (e instanceof PowerIndisponible) return NextResponse.json({ erreur: "Données NASA POWER indisponibles pour le moment." }, { status: 503 });
    throw e;
  }
}
