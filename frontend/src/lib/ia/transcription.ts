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

/** Transcription dédiée, compatible OpenAI (/audio/transcriptions) : Whisper sur Groq par défaut, gratuit avec une clé. */
export type ConfigStt = { cle: string; baseUrl: string; modele: string };

export function configStt(env: Record<string, string | undefined>): ConfigStt | null {
  const cle = env.STT_API_KEY || env.GROQ_API_KEY;
  if (!cle) return null;
  return {
    cle,
    baseUrl: (env.STT_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
    modele: env.STT_MODEL || "whisper-large-v3-turbo",
  };
}

async function whisper(audio: string, stt: ConfigStt, f: typeof fetch): Promise<string | null> {
  try {
    const octets = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append("file", new File([octets], "question.wav", { type: "audio/wav" }));
    form.append("model", stt.modele);
    form.append("language", "fr");
    form.append("response_format", "json");
    form.append("temperature", "0");
    // Indice de vocabulaire : Whisper reconnaît mieux les mots attendus.
    form.append("prompt", "Question d'un agriculteur ivoirien : semis, maïs, coton, igname, manioc, arachide, riz, sorgho, niébé, pluie, rotation.");
    const r = await f(`${stt.baseUrl}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${stt.cle}` }, body: form, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) {
      console.warn(`[stt] ${stt.modele} : HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 200)}`);
      return null;
    }
    const j = (await r.json()) as { text?: string };
    return typeof j.text === "string" ? j.text.trim().slice(0, 300) : null;
  } catch (e) {
    console.warn(`[stt] ${e instanceof Error ? e.message : "erreur"}`);
    return null;
  }
}

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

/**
 * OpenRouter demande un solde d'au moins 0,50 $ pour envoyer de l'audio, même aux modèles gratuits. Sans ce solde,
 * la dictée est annoncée indisponible et l'app reste sur les questions écrites. Réponse gardée 10 minutes.
 */
const SOLDE_MIN = 0.5;
const DUREE_CACHE = 10 * 60_000;
let disponibilite: { valeur: boolean; jusqua: number } | null = null;

export function oublierDisponibilite() {
  disponibilite = null;
}

export async function dicteeDisponible(config: ConfigIA, f: typeof fetch, maintenant = Date.now(), stt: ConfigStt | null = null): Promise<boolean> {
  if (stt) return true;
  if (!config.cle) return false;
  if (disponibilite && disponibilite.jusqua > maintenant) return disponibilite.valeur;
  let valeur = true;
  try {
    const r = await f(`${config.baseUrl}/credits`, { headers: { Authorization: `Bearer ${config.cle}` }, signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const j = (await r.json()) as { data?: { total_credits?: number; total_usage?: number } };
      const solde = (j.data?.total_credits ?? 0) - (j.data?.total_usage ?? 0);
      valeur = solde >= SOLDE_MIN;
    }
  } catch {
    /* solde illisible : on laisse essayer */
  }
  disponibilite = { valeur, jusqua: maintenant + DUREE_CACHE };
  return valeur;
}

export async function transcrire(audio: string, deps: { config: ConfigIA; modeles: string[]; fetch: typeof fetch; stt?: ConfigStt | null }): Promise<Transcription> {
  if (deps.stt) {
    const t = await whisper(audio, deps.stt, deps.fetch);
    if (t !== null) return { ok: true, texte: nettoyer(t) ?? "" };
  }
  if (!deps.config.cle || (deps.stt && disponibilite?.valeur === false)) return { ok: false, statut: deps.stt ? 502 : 503, erreur: deps.stt ? "La dictée ne répond pas pour le moment." : "La dictée n'est pas encore configurée." };
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
  if (r.ok) return { ok: true, texte: r.texte };
  if (r.credit) {
    disponibilite = { valeur: false, jusqua: Date.now() + DUREE_CACHE };
    return { ok: false, statut: 503, erreur: "La dictée n'est pas disponible pour le moment : écrivez votre question." };
  }
  return { ok: false, statut: 502, erreur: "La dictée ne répond pas pour le moment." };
}
