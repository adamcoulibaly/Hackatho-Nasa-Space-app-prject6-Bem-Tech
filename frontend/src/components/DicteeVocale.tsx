"use client";

import { useEffect, useRef, useState } from "react";

type Reconnaissance = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type Constructeur = new () => Reconnaissance;

/**
 * Dictée de la question en français : la voix est transformée en texte par le navigateur, et seul ce texte part
 * vers l'assistant. Sans reconnaissance vocale (ex. dans l'app Android), le bouton n'apparaît pas.
 */
export function DicteeVocale({ onTexte }: { onTexte: (texte: string) => void }) {
  const [Classe, setClasse] = useState<Constructeur | null>(null);
  const [ecoute, setEcoute] = useState(false);
  const rec = useRef<Reconnaissance | null>(null);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: Constructeur; webkitSpeechRecognition?: Constructeur };
    setClasse(() => w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null);
  }, []);
  if (!Classe) return null;
  const demarrer = () => {
    if (ecoute) return rec.current?.stop();
    const r = new Classe();
    r.lang = "fr-FR";
    r.interimResults = false;
    r.onresult = (e) => {
      const texte = Array.from(e.results).map((res) => res[0]?.transcript ?? "").join(" ").trim();
      if (texte) onTexte(texte.slice(0, 300));
    };
    r.onend = () => setEcoute(false);
    r.onerror = () => setEcoute(false);
    rec.current = r;
    setEcoute(true);
    r.start();
  };
  return (
    <button type="button" onClick={demarrer} aria-pressed={ecoute} aria-label="Poser la question à voix haute" className={`inline-flex h-12 items-center gap-2 rounded-full px-4 text-base font-bold ${ecoute ? "bg-orange text-ink" : "border border-ink"}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1A7 7 0 0 0 19 12h-2z" /></svg>
      {ecoute ? "J'écoute…" : "Dicter"}
    </button>
  );
}
