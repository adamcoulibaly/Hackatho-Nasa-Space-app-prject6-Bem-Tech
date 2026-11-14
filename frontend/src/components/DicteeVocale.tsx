"use client";

import { useEffect, useRef, useState } from "react";
import { ecouterNatif, envoyerAuNatif, estModeApp } from "@/lib/modeApp";
import { exigerInternet } from "@/lib/enLigne";

type Reconnaissance = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type Constructeur = new () => Reconnaissance;

const MESSAGES: Record<string, string> = {
  refus: "Autorisez le micro pour ForoSat (réglages du téléphone ou du navigateur), puis réessayez.",
  rien: "Je n'ai rien entendu. Appuyez sur « Dicter » et parlez tout de suite.",
  reseau: "La dictée a besoin d'une connexion internet. Vous pouvez écrire votre question.",
  micro: "Aucun micro trouvé sur cet appareil. Vous pouvez écrire votre question.",
  ancienne: "Mettez à jour l'application ForoSat pour utiliser la dictée. Vous pouvez écrire votre question.",
  autre: "La dictée n'a pas marché. Vous pouvez écrire votre question.",
};
const CODE_WEB: Record<string, keyof typeof MESSAGES | null> = {
  "not-allowed": "refus",
  "service-not-allowed": "refus",
  "no-speech": "rien",
  network: "reseau",
  "audio-capture": "micro",
  aborted: null,
};

/**
 * Dictée de la question en français : la voix devient du texte, et seul ce texte part vers l'assistant.
 * Dans l'app Android, c'est la reconnaissance vocale du téléphone (celle du navigateur intégré ne marche pas) ;
 * dans un navigateur, celle du navigateur. Sans aucune des deux, le bouton n'apparaît pas.
 */
export function DicteeVocale({ onTexte }: { onTexte: (texte: string) => void }) {
  const [mode, setMode] = useState<"app" | { web: Constructeur } | null>(null);
  const [ecoute, setEcoute] = useState(false);
  const [message, setMessage] = useState("");
  const rec = useRef<Reconnaissance | null>(null);
  const delai = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rappel = useRef(onTexte);
  rappel.current = onTexte;

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: Constructeur; webkitSpeechRecognition?: Constructeur; ReactNativeWebView?: unknown };
    if (estModeApp() && w.ReactNativeWebView) return setMode("app");
    const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setMode(C ? { web: C } : null);
  }, []);

  useEffect(() => {
    if (mode !== "app") return;
    return ecouterNatif((m) => {
      if (m.type !== "dictee") return;
      if (delai.current) clearTimeout(delai.current);
      setEcoute(false);
      if ("texte" in m) {
        setMessage("");
        rappel.current(m.texte);
      } else setMessage(MESSAGES[m.erreur === "indisponible" ? "autre" : m.erreur]);
    });
  }, [mode]);

  useEffect(() => () => {
    if (delai.current) clearTimeout(delai.current);
    rec.current?.stop();
  }, []);

  if (!mode) return null;

  const demarrer = () => {
    setMessage("");
    if (mode === "app") {
      if (ecoute) return;
      setEcoute(true);
      envoyerAuNatif({ type: "dicter" });
      // Une app trop ancienne ne répond pas : on ne laisse pas le bouton bloqué sur « J'écoute… ».
      delai.current = setTimeout(() => {
        setEcoute(false);
        setMessage(MESSAGES.ancienne);
      }, 20_000);
      return;
    }
    if (ecoute) return rec.current?.stop();
    // La dictée du navigateur passe par internet (celle du téléphone, dans l'app, peut marcher sans).
    if (!exigerInternet("la dictée")) return;
    const r = new mode.web();
    r.lang = "fr-FR";
    r.interimResults = false;
    r.onresult = (e) => {
      const texte = Array.from(e.results).map((res) => res[0]?.transcript ?? "").join(" ").trim();
      if (texte) {
        setMessage("");
        rappel.current(texte.slice(0, 300));
      }
    };
    r.onerror = (e) => {
      const code = e?.error ? CODE_WEB[e.error] : "autre";
      if (code !== null) setMessage(MESSAGES[code ?? "autre"]);
    };
    r.onend = () => setEcoute(false);
    rec.current = r;
    try {
      r.start();
      setEcoute(true);
    } catch {
      setEcoute(false);
      setMessage(MESSAGES.autre);
    }
  };

  return (
    <>
      <button type="button" onClick={demarrer} aria-pressed={ecoute} aria-label="Poser la question à voix haute" className={`inline-flex h-12 items-center gap-2 rounded-full px-4 text-base font-bold ${ecoute ? "bg-orange text-ink" : "border border-ink"}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1A7 7 0 0 0 19 12h-2z" /></svg>
        {ecoute ? "J'écoute…" : "Dicter"}
      </button>
      <span role="status" className="basis-full text-sm text-[#5C2E00] empty:hidden">{message}</span>
    </>
  );
}
