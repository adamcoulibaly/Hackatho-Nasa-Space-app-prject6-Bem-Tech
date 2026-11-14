/**
 * Dictée : la voix enregistrée sur le téléphone (WAV) est transcrite en texte par un modèle audio d'OpenRouter.
 * Ça marche partout (navigateur, app Android), sans dépendre de la reconnaissance vocale du téléphone.
 * L'audio n'est ni enregistré ni journalisé.
 */
import { z } from "zod";
import type { ConfigIA } from "./assistant";
import { enCascade } from "./cascade";

/** Nemotron 3 Nano Omni (NVIDIA, gratuit, comprend l'audio) d'abord ; deux modèles audio légers et peu chers en secours. */
export const MODELES_AUDIO_PAR_DEFAUT = ["nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "google/gemini-3.1-flash-lite", "openai/gpt-audio-mini"];

export function modelesAudio(env: Record<string, string | undefined>): string[] {
  const liste = (env.LLM_AUDIO_MODEL ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return liste.length ? liste : MODELES_AUDIO_PAR_DEFAUT;
}

/** 15 s de voix en WAV 16 kHz ≈ 480 Ko, ≈ 640 Ko en base64 : 1,2 Mo laisse de la marge. */
export const DicteeSchema = z.object({ audio: z.string().startsWith("UklGR").max(1_200_000).regex(/^[A-Za-z0-9+/=]+$/) });

const CONSIGNE = `Transcris mot à mot ce que dit la personne dans cet enregistrement. Elle parle français (parfois avec des mots de Côte d'Ivoire) et pose une question sur ses cultures.
Réponds UNIQUEMENT par la transcription, sans guillemets, sans traduction et sans commentaire. Si tu n'entends aucune parole, réponds exactement : [rien]`;

/** Texte du modèle → transcription propre ; "" si rien n'a été dit. */
export function nettoyer(t: string): string | null {
  const s = t.trim().replace(/^["«“”»\s]+|["«“”»\s]+$/g, "").trim();
  if (!s) return null;
  if (/^\[?rien\]?\.?$/i.test(s)) return "";
  return s.slice(0, 300);
}

export type Transcription = { ok: true; texte: string } | { ok: false; statut: number; erreur: string };

export async function transcrire(audio: string, deps: { config: ConfigIA; modeles: string[]; fetch: typeof fetch }): Promise<Transcription> {
  if (!deps.config.cle) return { ok: false, statut: 503, erreur: "La dictée n'est pas encore configurée." };
  const r = await enCascade({
    famille: "dictee",
    modeles: deps.modeles,
    url: `${deps.config.baseUrl}/chat/completions`,
    cle: deps.config.cle,
    fetch: deps.fetch,
    corps: (model) => ({
      model,
      temperature: 0,
      max_tokens: 800,
      reasoning: { effort: "low", exclude: true },
      messages: [{ role: "user", content: [{ type: "text", text: CONSIGNE }, { type: "input_audio", input_audio: { data: audio, format: "wav" } }] }],
    }),
    valider: nettoyer,
    relanceMs: 6000,
    totalMs: 25_000,
  });
  return r.ok ? { ok: true, texte: r.texte } : { ok: false, statut: 502, erreur: "La dictée ne répond pas pour le moment." };
}
