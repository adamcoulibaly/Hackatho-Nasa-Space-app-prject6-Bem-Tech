import { NextResponse } from "next/server";
import { configDepuisEnv } from "@/lib/ia/assistant";
import { DicteeSchema, modelesAudio, transcrire } from "@/lib/ia/transcription";
import { adresse, limiteur, memeOrigine } from "@/lib/limite";

export const dynamic = "force-dynamic";

// 20 dictées par adresse et par 10 minutes (par instance) : protège le quota du modèle audio.
const autoriser = limiteur({ max: 20, fenetreMs: 10 * 60_000 });

/** Dictée : WAV de la question → texte. L'audio n'est ni enregistré ni journalisé. */
export async function POST(req: Request) {
  if (!memeOrigine(req)) return NextResponse.json({ erreur: "Origine non autorisée." }, { status: 403 });
  if (!autoriser(adresse(req))) return NextResponse.json({ erreur: "Trop de dictées d'affilée : réessayez dans quelques minutes." }, { status: 429 });
  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "Demande illisible." }, { status: 400 });
  }
  const d = DicteeSchema.safeParse(corps);
  if (!d.success) return NextResponse.json({ erreur: "Enregistrement invalide ou trop long." }, { status: 400 });
  const r = await transcrire(d.data.audio, { config: configDepuisEnv(process.env), modeles: modelesAudio(process.env), fetch });
  return r.ok ? NextResponse.json({ texte: r.texte }) : NextResponse.json({ erreur: r.erreur }, { status: r.statut });
}
