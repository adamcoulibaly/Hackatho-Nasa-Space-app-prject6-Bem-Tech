import { z } from "zod";
import { CRITERES, CRITERE_LABELS, type Climat, type Rotation } from "@/lib/contract";
import { scoreWord } from "@/lib/format";

/** Fournisseur compatible OpenAI (OpenRouter par défaut, Groq, etc.). La clé reste côté serveur. */
export type ConfigIA = { cle?: string; baseUrl: string; modele: string };

export const MODELE_PAR_DEFAUT = "google/gemma-4-31b-it:free";

export function configDepuisEnv(env: Record<string, string | undefined>): ConfigIA {
  return {
    cle: env.LLM_API_KEY || undefined,
    baseUrl: (env.LLM_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, ""),
    modele: env.LLM_MODEL || MODELE_PAR_DEFAUT,
  };
}

export const DemandeSchema = z.object({
  rotationId: z.enum(["A", "B", "C"]),
  question: z.string().trim().max(300).optional(),
});
export type Demande = z.infer<typeof DemandeSchema>;

type Message = { role: "system" | "user"; content: string };

const REGLES = `Tu es l'assistant de ForoSat, un outil d'aide à la décision pour les agriculteurs de Côte d'Ivoire.
Règles :
- Réponds en français simple, phrases courtes, 120 mots au plus, sans jargon (explique un terme technique s'il le faut).
- Appuie-toi uniquement sur les faits fournis. N'invente aucun chiffre, aucune date, aucun prix.
- Si l'information manque, dis-le simplement et propose de demander à un conseiller agricole.
- Tu n'as pas calculé le score : il vient de règles agronomiques transparentes. Ne le modifie pas.
- Termine en rappelant de valider la décision avec un conseiller agricole.`;

export function construireMessages(rotation: Rotation, climat: Climat, question?: string): Message[] {
  const scores = CRITERES.map((k) => `${CRITERE_LABELS[k]} : ${scoreWord(rotation.scores[k])}`).join(" ; ");
  const faits = [
    `Rotation ${rotation.id} (${rotation.tag}) : ${rotation.sequence.join(" → ")}.`,
    `Scores : ${scores}.`,
    `Pourquoi : ${rotation.pourquoi.join(" ")}`,
    `Risques : ${rotation.risques.join(" ")}`,
    `Lacune : ${rotation.lacune}`,
    `Confiance : ${rotation.confiance.niveau}.`,
    `Climat de la zone : ${climat.indicateurs.map((i) => `${i.label} ${i.valeur}`).join(" ; ")}.`,
    climat.meta ? `Données réelles : ${climat.meta.reel.join(", ")} (${climat.meta.source}, ${climat.meta.periode}). Le reste est en valeurs d'exemple.` : "Toutes les valeurs sont des exemples.",
  ].join("\n");
  const demande = question?.trim() ? `Question de l'agriculteur : ${question.trim()}` : "Explique simplement cette rotation à un agriculteur : ce qu'il sème, quand, pourquoi, et à quoi faire attention.";
  return [
    { role: "system", content: REGLES },
    { role: "user", content: `Faits ForoSat :\n${faits}\n\n${demande}` },
  ];
}

export type Reponse = { ok: true; texte: string } | { ok: false; statut: number; erreur: string };

const NON_CONFIGURE = "L'assistant IA n'est pas encore configuré.";
const SATURE = "L'assistant IA est saturé pour le moment. Réessayez dans une minute.";
const INDISPONIBLE = "L'assistant IA ne répond pas pour le moment.";

export async function repondre(
  demande: Demande,
  deps: { config: ConfigIA; fetch: typeof fetch; rotation: Rotation; climat: Climat },
): Promise<Reponse> {
  const { config } = deps;
  if (!config.cle) return { ok: false, statut: 503, erreur: NON_CONFIGURE };
  try {
    const r = await deps.fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.cle}`,
        "Content-Type": "application/json",
        "X-Title": "ForoSat",
      },
      body: JSON.stringify({
        model: config.modele,
        messages: construireMessages(deps.rotation, deps.climat, demande.question),
        temperature: 0.3,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (r.status === 429) return { ok: false, statut: 502, erreur: SATURE };
    if (!r.ok) return { ok: false, statut: 502, erreur: INDISPONIBLE };
    const json = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const texte = json.choices?.[0]?.message?.content?.trim();
    if (!texte) return { ok: false, statut: 502, erreur: INDISPONIBLE };
    return { ok: true, texte };
  } catch {
    return { ok: false, statut: 502, erreur: INDISPONIBLE };
  }
}
