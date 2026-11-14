import { z } from "zod";
import { CRITERES, CRITERE_LABELS, type Climat, type Culture, type Rotation, type Saisons } from "@/lib/contract";
import { lireLienFiche } from "@/lib/moteur/fiche-lien";
import { calculerRotations } from "@/lib/moteur/rotations";
import { scoreWord } from "@/lib/format";
import { enCascade } from "./cascade";

/** Fournisseur compatible OpenAI (OpenRouter par défaut, Groq, etc.). La clé reste côté serveur. */
/** Modèles essayés dans l'ordre : le suivant prend le relais si le précédent est saturé ou en erreur. */
export type ConfigIA = { cle?: string; baseUrl: string; modeles: string[] };

/**
 * Modèles gratuits légers et peu sollicités sur OpenRouter, essayés en relais (voir cascade.ts) :
 * Nemotron 3.5 Lightning (NVIDIA, rapide) d'abord, puis Ling 3.2 Flash, Gemma 4 26B A4B (4 milliards de paramètres actifs),
 * ERNIE 5.5 Flash et Nemotron 3 Nano ; Nemotron 3.5 Super en dernier recours.
 */
export const MODELES_PAR_DEFAUT = [
  "nvidia/nemotron-3.5-lightning:free",
  "inclusionai/ling-3.2-flash:free",
  "google/gemma-4-26b-a4b-it:free",
  "baidu/ernie-5.5-flash-preview:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "nvidia/nemotron-3.5-super-vl:free",
];

export function configDepuisEnv(env: Record<string, string | undefined>): ConfigIA {
  const liste = (env.LLM_MODEL ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  return {
    cle: env.LLM_API_KEY || undefined,
    baseUrl: (env.LLM_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, ""),
    modeles: liste.length ? liste : MODELES_PAR_DEFAUT,
  };
}

/**
 * La demande ne transporte que l'identifiant de la rotation et les paramètres de la parcelle (ceux du lien de fiche) :
 * le serveur recalcule la rotation avec le moteur. Aucun texte libre autre que la question (300 caractères).
 */
export const DemandeSchema = z.object({
  id: z.enum(["A", "B", "C"]),
  params: z.string().max(500),
  question: z.string().trim().max(300).optional(),
  /** Vrai si la question a été dite à voix haute (transcription automatique, possibles erreurs). */
  voix: z.boolean().optional(),
  /** Échanges précédents de la conversation (au plus 4 questions-réponses), pour les questions de suite. */
  historique: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(600) })).max(8).optional(),
});
export type Demande = z.infer<typeof DemandeSchema>;

type Message = { role: "system" | "user" | "assistant"; content: string };
export type Echange = { role: "user" | "assistant"; content: string };

const REGLES = `Tu es l'assistant de ForoSat, un outil d'aide à la décision pour les agriculteurs de Côte d'Ivoire.
Règles :
- Réponds en français simple, phrases courtes, 120 mots au plus, sans jargon (explique un terme technique s'il le faut).
- Appuie-toi uniquement sur les faits fournis. N'invente aucun chiffre, aucune date, aucun prix.
- Si l'information manque, dis-le simplement et propose de demander à un conseiller agricole.
- Tu n'as pas calculé le score : il vient de règles agronomiques transparentes. Ne le modifie pas.
- Termine en rappelant de valider la décision avec un conseiller agricole.`;

export function construireMessages(rotation: Rotation, climat: Climat, question?: string, historique: Echange[] = [], voix = false): Message[] {
  const scores = CRITERES.map((k) => `${CRITERE_LABELS[k]} : ${scoreWord(rotation.scores[k])}`).join(" ; ");
  const faits = [
    `Rotation ${rotation.id} (${rotation.tag}) : ${rotation.sequence.join(" → ")}.`,
    `Scores : ${scores}.`,
    `Pourquoi : ${rotation.pourquoi.join(" ")}`,
    `Risques : ${rotation.risques.join(" ")}`,
    `Lacune : ${rotation.lacune}`,
    `Confiance : ${rotation.confiance.niveau}.`,
    `Climat de la zone : ${climat.indicateurs.map((i) => `${i.label} ${i.valeur}`).join(" ; ")}.`,
    climat.meta ? `Sources : ${climat.meta.reel.join(", ")} (${climat.meta.source}, ${climat.meta.periode}). Végétation et eau stockée : pas encore disponibles.` : "Source du climat inconnue.",
  ].join("\n");
  const dictee = voix
    ? "\n(Question dictée à voix haute et transcrite automatiquement : elle peut contenir des erreurs de transcription ; comprends-la au mieux selon le contexte agricole, et si elle reste obscure, demande de reformuler.)"
    : "";
  const demande = question?.trim()
    ? `Question de l'agriculteur : ${question.trim()}${dictee}`
    : "Explique simplement cette rotation à un agriculteur : ce qu'il sème, quand, pourquoi, et à quoi faire attention.";
  const suite = historique.length ? "\nC'est la suite de la conversation ci-dessus : réponds à la nouvelle question en tenant compte des échanges précédents." : "";
  return [
    { role: "system", content: REGLES },
    ...historique.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: `Faits ForoSat :\n${faits}\n\n${demande}${suite}` },
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
  const messages = construireMessages(deps.rotation, deps.climat, demande.question, demande.historique ?? [], demande.voix ?? false);
  const r = await enCascade({
    famille: "assistant",
    modeles: config.modeles,
    url: `${config.baseUrl}/chat/completions`,
    cle: config.cle,
    fetch: deps.fetch,
    // Les modèles qui raisonnent consomment des jetons avant de répondre : raisonnement court, non renvoyé,
    // et une marge suffisante pour la réponse.
    corps: (model) => ({ model, messages, temperature: 0.3, max_tokens: 1500, reasoning: { effort: "low", exclude: true } }),
    relanceMs: 5000,
    totalMs: 25_000,
  });
  if (r.ok) return { ok: true, texte: r.texte.trim() };
  const sature = r.sature;
  return { ok: false, statut: 502, erreur: sature ? SATURE : INDISPONIBLE };
}

/** Rotation recalculée par le moteur à partir des paramètres de la demande, ou null si la parcelle est invalide. */
export function rotationDepuisDemande(d: Pick<Demande, "id" | "params">, ctx: { climat: Climat; cultures: Culture[]; saisons?: Saisons | null }): Rotation | null {
  const parcelle = lireLienFiche(new URLSearchParams(d.params));
  if (!parcelle) return null;
  return calculerRotations(parcelle, ctx.climat, ctx.cultures, ctx.saisons)?.find((r) => r.id === d.id) ?? null;
}
