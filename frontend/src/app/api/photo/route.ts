import { NextResponse } from "next/server";
import { configDepuisEnv } from "@/lib/ia/assistant";
import { MODELE_VISION_PAR_DEFAUT } from "@/lib/ia/vision";
import { traiterPhoto } from "@/lib/photo/traiter";
import { ndviParcelle } from "@/lib/satellite/ndvi";
import { getClimatRegion } from "@/lib/data";
import { adresse, limiteur, memeOrigine } from "@/lib/limite";
import { lireTuile } from "@/lib/satellite/tuile";

export const dynamic = "force-dynamic";

// 10 analyses par adresse et par 10 minutes (par instance) : protège le quota gratuit du modèle de vision.
const autoriser = limiteur({ max: 10, fenetreMs: 10 * 60_000 });

/** Normale du NDVI pour ce mois dans la région (onglet « veg » du climat, NDVI MODIS mensuel). */
async function normale(region: string, mois: string): Promise<number | null> {
  try {
    const veg = (await getClimatRegion(region)).onglets.find((o) => o.id === "veg");
    return veg?.valeurs[Number(mois.slice(5, 7)) - 1] ?? null;
  } catch {
    return null;
  }
}

/** Vrai pendant la saison des pluies principale de la région (mois de début à mois de fin). */
async function enSaison(region: string): Promise<boolean> {
  try {
    const { debut, fin } = (await getClimatRegion(region)).saisonPluies;
    const m = new Date().getMonth() + 1;
    return debut <= fin ? m >= debut && m <= fin : m >= debut || m <= fin;
  } catch {
    return false;
  }
}

/** Photo du champ : analyse par un modèle de vision et comparaison au NDVI NASA. Rien n'est enregistré ni journalisé de l'image. */
export async function POST(req: Request) {
  if (!memeOrigine(req)) return NextResponse.json({ erreur: "Origine non autorisée." }, { status: 403 });
  if (!autoriser(adresse(req))) return NextResponse.json({ erreur: "Trop d'analyses d'affilée : réessayez dans quelques minutes." }, { status: 429 });
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Demande illisible." }, { status: 400 });
  }
  const r = await traiterPhoto(corps, {
    config: configDepuisEnv(process.env),
    modele: process.env.LLM_VISION_MODEL || MODELE_VISION_PAR_DEFAUT,
    fetch,
    ndvi: (lat, lon) => ndviParcelle(lat, lon, new Date(), (url) => lireTuile(url)),
    normale,
    enSaison,
  });
  return NextResponse.json(r.corps, { status: r.statut });
}
