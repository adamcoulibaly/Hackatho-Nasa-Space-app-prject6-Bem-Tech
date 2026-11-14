import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

export type ReponseDictee = { type: "dictee"; texte: string } | { type: "dictee"; erreur: "refus" | "rien" | "indisponible" };

/** Code d'erreur de la reconnaissance vocale → ce que la page doit dire à l'agriculteur. */
export function erreurDictee(code: string | undefined): "refus" | "rien" | "indisponible" {
  if (code === "not-allowed") return "refus";
  if (code === "no-speech" || code === "speech-timeout" || code === "nomatch") return "rien";
  return "indisponible";
}

let enCours = false;

/**
 * Dictée en français avec la reconnaissance vocale du téléphone (celle de Google sur Android).
 * Renvoie le texte reconnu, ou une erreur ; ne reste jamais bloquée (arrêt au bout de 15 s).
 */
export async function dicter(): Promise<ReponseDictee> {
  if (enCours) ExpoSpeechRecognitionModule.abort();
  const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!permission.granted) return { type: "dictee", erreur: "refus" };
  if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return { type: "dictee", erreur: "indisponible" };
  enCours = true;
  return new Promise<ReponseDictee>((resoudre) => {
    let texte = "";
    let fini = false;
    const abonnements = [
      ExpoSpeechRecognitionModule.addListener("result", (e) => {
        const t = e.results[0]?.transcript?.trim();
        if (t) texte = t;
      }),
      ExpoSpeechRecognitionModule.addListener("nomatch", () => terminer({ type: "dictee", erreur: "rien" })),
      ExpoSpeechRecognitionModule.addListener("error", (e) => terminer({ type: "dictee", erreur: erreurDictee(e.error) })),
      ExpoSpeechRecognitionModule.addListener("end", () => terminer(texte ? { type: "dictee", texte: texte.slice(0, 300) } : { type: "dictee", erreur: "rien" })),
    ];
    const delai = setTimeout(() => ExpoSpeechRecognitionModule.stop(), 15_000);
    function terminer(r: ReponseDictee) {
      if (fini) return;
      fini = true;
      enCours = false;
      clearTimeout(delai);
      abonnements.forEach((a) => a.remove());
      resoudre(r);
    }
    try {
      ExpoSpeechRecognitionModule.start({ lang: "fr-FR", interimResults: false, maxAlternatives: 1, continuous: false });
    } catch {
      terminer({ type: "dictee", erreur: "indisponible" });
    }
  });
}
