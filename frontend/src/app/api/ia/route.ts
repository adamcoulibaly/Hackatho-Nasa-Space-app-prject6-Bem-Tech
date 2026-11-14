import { NextResponse } from "next/server";
import { configDepuisEnv, DemandeSchema, repondre, rotationsDepuisDemande } from "@/lib/ia/assistant";
import { lireLienFiche } from "@/lib/moteur/fiche-lien";
import { getClimatRegion, getCultures, getSaisons } from "@/lib/data";

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
  // Mêmes données que la page (climat, fiches, saisons rejouées) : l'IA explique exactement la rotation affichée.
  const [climat, cultures, saisons] = await Promise.all([getClimatRegion(parcelle.region), getCultures(), getSaisons(parcelle.region).catch(() => null)]);
  // Les trois rotations : l'IA peut comparer celle qu'on regarde aux deux autres.
  const trouve = rotationsDepuisDemande(demande.data, { climat, cultures, saisons });
  if (!trouve) return NextResponse.json({ erreur: "Rotation introuvable." }, { status: 400 });

  const r = await repondre(demande.data, { config: configDepuisEnv(process.env), fetch, rotation: trouve.rotation, autres: trouve.autres, climat });
  return r.ok ? NextResponse.json({ texte: r.texte, ...(r.secours ? { secours: true } : {}) }) : NextResponse.json({ erreur: r.erreur }, { status: r.statut });
}
