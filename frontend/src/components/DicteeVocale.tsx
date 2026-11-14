"use client";

import { useEffect, useRef, useState } from "react";
import { dicteePossible } from "@/lib/enregistreur";
import { exigerInternet } from "@/lib/enLigne";
import { estModeApp } from "@/lib/modeApp";
import { ErreurDictee, moteurApp, moteurNavigateur, moteurServeur, type ConstructeurReconnaissance, type Ecoute, type Moteur } from "@/lib/reconnaissance";

const DUREE_MAX = 15;
const MESSAGES = {
  refus: "Autorisez le micro pour ForoSat (réglages du téléphone ou du navigateur), puis réessayez.",
  micro: "Aucun micro trouvé sur cet appareil. Vous pouvez écrire votre question.",
  rien: "Je n'ai rien entendu. Touchez « Dicter », parlez, puis touchez « Terminer ».",
  reseau: "La dictée vocale ne marche pas dans ce navigateur. Ouvrez ForoSat dans Google Chrome ou dans l'app, ou écrivez votre question.",
  ancienne: "Mettez à jour l'application ForoSat pour dicter. Vous pouvez écrire votre question.",
  autre: "La dictée n'a pas marché. Vous pouvez écrire votre question ou réessayer.",
} as const;

type Fenetre = { SpeechRecognition?: ConstructeurReconnaissance; webkitSpeechRecognition?: ConstructeurReconnaissance; ReactNativeWebView?: unknown };

/** Vrai dans l'app Android (WebView) : sa reconnaissance vocale « navigateur » existe mais ne marche jamais. */
function dansWebView(w: Fenetre): boolean {
  return (estModeApp() && !!w.ReactNativeWebView) || /; wv\)/.test(navigator.userAgent);
}

async function serveurDisponible(): Promise<boolean> {
  if (!dicteePossible()) return false;
  return fetch("/api/dictee")
    .then((r) => (r.ok ? r.json() : {}))
    .then((j: { disponible?: boolean }) => j.disponible === true)
    .catch(() => false);
}

/**
 * Meilleur moyen disponible : transcription ForoSat (serveur), sinon reconnaissance du téléphone (app),
 * sinon celle du navigateur (jamais dans l'app) ; null si aucun.
 */
async function choisirMoteur(): Promise<Moteur | null> {
  const w = window as unknown as Fenetre;
  if (await serveurDisponible()) return moteurServeur();
  if (w.ReactNativeWebView && estModeApp()) return moteurApp();
  if (dansWebView(w)) return null;
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? moteurNavigateur(C) : null;
}

/**
 * Dicter sa question : on parle, la voix devient du texte, et le texte est transmis (l'assistant le reçoit comme un
 * message de chat). `moteur` : imposé (tests) ou null (pas de dictée) ; par défaut, choisi automatiquement.
 */
export function DicteeVocale({ onTexte, moteur }: { onTexte: (texte: string) => void; moteur?: Moteur | null }) {
  const [choisi, setChoisi] = useState<Moteur | null>(moteur ?? null);
  const [etat, setEtat] = useState<"repos" | "ecoute" | "ecriture">("repos");
  const [reste, setReste] = useState(DUREE_MAX);
  const [message, setMessage] = useState("");
  const ecoute = useRef<Ecoute | null>(null);
  const minuterie = useRef<ReturnType<typeof setInterval> | null>(null);
  const rappel = useRef(onTexte);
  rappel.current = onTexte;

  useEffect(() => {
    if (moteur !== undefined) return setChoisi(moteur);
    let annule = false;
    choisirMoteur().then((m) => !annule && setChoisi(m));
    return () => {
      annule = true;
    };
  }, [moteur]);
  useEffect(() => () => {
    if (minuterie.current) clearInterval(minuterie.current);
    ecoute.current?.annuler();
  }, []);

  if (!choisi) return null;

  const terminer = async () => {
    if (minuterie.current) clearInterval(minuterie.current);
    minuterie.current = null;
    const e = ecoute.current;
    ecoute.current = null;
    if (!e) return;
    setEtat("ecriture");
    try {
      const texte = await e.terminer();
      if (texte) rappel.current(texte);
      else setMessage(MESSAGES.rien);
    } catch (err) {
      const code = err instanceof ErreurDictee ? err.code : "autre";
      setMessage(MESSAGES[code]);
      // Reconnaissance du téléphone ou du navigateur en échec : l'essai suivant passe par la transcription ForoSat.
      if (code !== "refus" && choisi.nom !== "serveur" && moteur === undefined && (await serveurDisponible())) {
        setChoisi(moteurServeur());
        setMessage("Cette reconnaissance vocale n'a pas marché : ForoSat transcrira votre voix. Touchez « Dicter » et parlez.");
      }
    } finally {
      setEtat("repos");
    }
  };

  const commencer = async () => {
    setMessage("");
    if (!exigerInternet("la dictée")) return;
    // La transcription ForoSat a pu devenir disponible depuis l'ouverture de la page : on la préfère.
    let m = choisi;
    if (m.nom !== "serveur" && moteur === undefined && (await serveurDisponible())) {
      m = moteurServeur();
      setChoisi(m);
    }
    try {
      ecoute.current = await m.demarrer();
    } catch (err) {
      return setMessage(MESSAGES[err instanceof ErreurDictee ? err.code : "autre"]);
    }
    // La fin de la parole (navigateur, téléphone) envoie le texte sans attendre « Terminer ».
    ecoute.current.surFin(() => void terminer());
    setEtat("ecoute");
    setReste(DUREE_MAX);
    const debut = Date.now();
    minuterie.current = setInterval(() => {
      const r = DUREE_MAX - Math.floor((Date.now() - debut) / 1000);
      setReste(Math.max(0, r));
      if (r <= 0) void terminer();
    }, 250);
  };

  const enEcoute = etat === "ecoute";
  return (
    <>
      <button
        type="button"
        data-moteur={choisi.nom}
        onClick={() => (enEcoute ? void terminer() : void commencer())}
        disabled={etat === "ecriture"}
        aria-pressed={enEcoute}
        aria-label={enEcoute ? "Terminer la dictée" : "Poser la question à voix haute"}
        className={`inline-flex h-12 items-center gap-2 rounded-full px-4 text-base font-bold disabled:opacity-60 ${enEcoute ? "micro-ecoute bg-orange text-ink" : "border border-ink"}`}
      >
        {enEcoute ? (
          <span aria-hidden="true" className="h-3 w-3 animate-pulse rounded-full bg-[#C2410C]" />
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1A7 7 0 0 0 19 12h-2z" /></svg>
        )}
        {enEcoute ? `Terminer (${reste} s)` : etat === "ecriture" ? "Écriture…" : "Dicter"}
      </button>
      <span role="status" className="basis-full text-sm text-[#5C2E00] empty:hidden">
        {enEcoute ? "Parlez maintenant ; votre question partira à l'assistant dès que vous aurez fini." : message}
      </span>
    </>
  );
}
