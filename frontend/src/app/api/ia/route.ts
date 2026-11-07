import { NextResponse } from "next/server";
import { configDepuisEnv, DemandeSchema, repondre } from "@/lib/ia/assistant";
import { getClimatRegion } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Demande illisible." }, { status: 400 });
  }
  const demande = DemandeSchema.safeParse(corps);
  if (!demande.success) return NextResponse.json({ erreur: "Demande invalide." }, { status: 400 });

  const climat = await getClimatRegion(demande.data.region).catch(() => null);
  if (!climat) return NextResponse.json({ erreur: "Région inconnue." }, { status: 404 });
  const rotation = demande.data.rotation;

  const r = await repondre(demande.data, { config: configDepuisEnv(process.env), fetch, rotation, climat });
  return r.ok ? NextResponse.json({ texte: r.texte }) : NextResponse.json({ erreur: r.erreur }, { status: r.statut });
}
