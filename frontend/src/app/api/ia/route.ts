import { NextResponse } from "next/server";
import { configDepuisEnv, DemandeSchema, repondre, rotationDepuisDemande } from "@/lib/ia/assistant";
import { lireLienFiche } from "@/lib/moteur/fiche-lien";
import { getClimatRegion, getCultures } from "@/lib/data";

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

  const parcelle = lireLienFiche(new URLSearchParams(demande.data.params));
  if (!parcelle) return NextResponse.json({ erreur: "Parcelle invalide." }, { status: 400 });
  const [climat, cultures] = await Promise.all([getClimatRegion(parcelle.region), getCultures()]);
  const rotation = rotationDepuisDemande(demande.data, { climat, cultures });
  if (!rotation) return NextResponse.json({ erreur: "Rotation introuvable." }, { status: 400 });

  const r = await repondre(demande.data, { config: configDepuisEnv(process.env), fetch, rotation, climat });
  return r.ok ? NextResponse.json({ texte: r.texte }) : NextResponse.json({ erreur: r.erreur }, { status: r.statut });
}
