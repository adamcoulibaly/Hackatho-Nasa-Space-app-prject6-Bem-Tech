"use client";

import { useEffect, useState } from "react";
import { envoyerAuNatif, estModeApp } from "@/lib/modeApp";

type Mode = "app" | "navigateur" | null;

/** Bouton « Écouter » : lit le texte en français, avec la voix du téléphone (app) ou du navigateur (site). */
export function LireAVoixHaute({ texte }: { texte: string }) {
  const [mode, setMode] = useState<Mode>(null);
  useEffect(() => {
    const pont = (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    if (estModeApp() && pont) setMode("app");
    else if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) setMode("navigateur");
  }, []);
  if (!mode) return null;
  const lire = () => {
    if (mode === "app") return void envoyerAuNatif({ type: "lire", texte });
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = "fr-FR";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };
  return (
    <button type="button" onClick={lire} className="no-print inline-flex h-11 items-center gap-2 self-start rounded-full border border-ink px-4 text-sm font-bold">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" /></svg>
      Écouter
    </button>
  );
}
