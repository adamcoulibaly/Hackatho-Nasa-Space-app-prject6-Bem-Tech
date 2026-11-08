/** Analyse d'une photo de champ par un modèle de vision gratuit (OpenRouter, compatible OpenAI). La photo n'est jamais enregistrée. */
import { z } from "zod";
import type { ConfigIA } from "./assistant";

const CULTURES = ["Maïs", "Coton", "Igname", "Manioc", "Arachide", "Riz", "Sorgho", "Niébé"] as const;
export const MODELE_VISION_PAR_DEFAUT = "nvidia/nemotron-3.5-super-vl:free";

export const AnalysePhotoSchema = z.object({
  culture: z.enum([...CULTURES, "inconnue", "aucune"]),
  couvertureSol: z.number().min(0).max(100),
  etat: z.enum(["vigoureux", "jaunissement", "sec", "sol_nu"]),
  remarque: z.string().max(160),
});
export type AnalysePhoto = z.infer<typeof AnalysePhotoSchema>;

const CONSIGNE = `Tu analyses la photo d'un champ en Côte d'Ivoire pour un agriculteur. Réponds UNIQUEMENT par un objet JSON :
{"culture": une valeur parmi ${[...CULTURES, "inconnue", "aucune"].map((c) => `"${c}"`).join(", ")},
 "couvertureSol": pourcentage du sol couvert par des plantes (0 à 100),
 "etat": "vigoureux" | "jaunissement" | "sec" | "sol_nu",
 "remarque": une phrase en français simple, 160 caractères au plus}.
Si tu n'es pas sûr de la culture, réponds "inconnue". S'il n'y a aucune culture, "aucune". N'invente rien.`;

/** Premier objet JSON d'un texte (nu, en bloc Markdown ou entouré de prose), ou null. */
export function extraireJson(texte: string): unknown | null {
  const debut = texte.indexOf("{");
  const fin = texte.lastIndexOf("}");
  if (debut < 0 || fin <= debut) return null;
  try {
    return JSON.parse(texte.slice(debut, fin + 1));
  } catch {
    return null;
  }
}

export async function analyserPhoto(image: string, deps: { config: ConfigIA; modele: string; fetch: typeof fetch }): Promise<AnalysePhoto | null> {
  const { config } = deps;
  try {
    const r = await deps.fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.cle}`, "Content-Type": "application/json", "X-Title": "ForoSat" },
      body: JSON.stringify({
        model: deps.modele,
        temperature: 0.1,
        max_tokens: 1500,
        reasoning: { effort: "low", exclude: true },
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CONSIGNE },
          { role: "user", content: [{ type: "text", text: "Analyse ce champ." }, { type: "image_url", image_url: { url: image } }] },
        ],
      }),
      signal: AbortSignal.timeout(40_000),
    });
    if (!r.ok) {
      console.warn(`[photo] ${deps.modele} : HTTP ${r.status} ${(await r.text().catch(() => "")).slice(0, 300)}`);
      return null;
    }
    const json = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const v = AnalysePhotoSchema.safeParse(extraireJson(json.choices?.[0]?.message?.content ?? ""));
    if (!v.success) console.warn(`[photo] ${deps.modele} : réponse non conforme`);
    return v.success ? v.data : null;
  } catch (e) {
    console.warn(`[photo] ${deps.modele} : ${e instanceof Error ? e.message : "erreur"}`);
    return null;
  }
}
