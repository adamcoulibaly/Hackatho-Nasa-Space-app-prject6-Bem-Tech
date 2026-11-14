"use client";

import { useEffect, useRef, useState } from "react";
import { demarrerEnregistrement, dicteePossible, type Session } from "@/lib/enregistreur";
import { exigerInternet } from "@/lib/enLigne";

export type Enregistreur = () => Promise<Session>;

const DUREE_MAX = 15;
const MESSAGES = {
  refus: "Autorisez le micro pour ForoSat (réglages du téléphone ou du navigateur), puis réessayez.",
  micro: "Aucun micro trouvé sur cet appareil. Vous pouvez écrire votre question.",
  rien: "Je n'ai rien entendu. Touchez « Dicter », parlez, puis touchez « Terminer ».",
  autre: "La dictée n'a pas marché. Vous pouvez écrire votre question ou réessayer.",
} as const;

function erreurMicro(e: unknown): keyof typeof MESSAGES {
  const nom = (e as { name?: string })?.name ?? "";
  if (nom === "NotAllowedError" || nom === "SecurityError" || nom === "PermissionDeniedError") return "refus";
  if (nom === "NotFoundError" || nom === "OverconstrainedError" || nom === "NotReadableError") return "micro";
  return "autre";
}

/**
 * Dictée de la question : la voix est enregistrée sur l'appareil, puis transcrite en texte par un modèle audio côté
 * serveur (/api/dictee). Même fonctionnement sur ordinateur, téléphone et dans l'app Android.
 * `enregistrer` : null = pas de micro (bouton masqué) ; par défaut, le micro de l'appareil.
 */
export function DicteeVocale({ onTexte, enregistrer }: { onTexte: (texte: string) => void; enregistrer?: Enregistreur | null }) {
  const [dispo, setDispo] = useState<Enregistreur | null>(() => enregistrer ?? null);
  const [etat, setEtat] = useState<"repos" | "ecoute" | "ecriture">("repos");
  const [reste, setReste] = useState(DUREE_MAX);
  const [message, setMessage] = useState("");
  const session = useRef<Session | null>(null);
  const minuterie = useRef<ReturnType<typeof setInterval> | null>(null);
  const rappel = useRef(onTexte);
  rappel.current = onTexte;

  useEffect(() => {
    if (enregistrer === undefined) setDispo(() => (dicteePossible() ? demarrerEnregistrement : null));
  }, [enregistrer]);
  useEffect(() => () => {
    if (minuterie.current) clearInterval(minuterie.current);
    session.current?.annuler();
  }, []);

  if (!dispo) return null;

  const terminer = async () => {
    if (minuterie.current) clearInterval(minuterie.current);
    minuterie.current = null;
    const s = session.current;
    session.current = null;
    if (!s) return;
    setEtat("ecriture");
    try {
      const audio = await s.arreter();
      const r = await fetch("/api/dictee", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio }) });
      const json = (await r.json().catch(() => ({}))) as { texte?: string };
      if (!r.ok || typeof json.texte !== "string") setMessage(MESSAGES.autre);
      else if (!json.texte.trim()) setMessage(MESSAGES.rien);
      else rappel.current(json.texte.trim());
    } catch {
      setMessage(MESSAGES.autre);
    } finally {
      setEtat("repos");
    }
  };

  const commencer = async () => {
    setMessage("");
    if (!exigerInternet("la dictée")) return;
    try {
      session.current = await dispo();
    } catch (e) {
      return setMessage(MESSAGES[erreurMicro(e)]);
    }
    setEtat("ecoute");
    setReste(DUREE_MAX);
    const debut = Date.now();
    minuterie.current = setInterval(() => {
      const r = DUREE_MAX - Math.floor((Date.now() - debut) / 1000);
      setReste(Math.max(0, r));
      if (r <= 0) void terminer();
    }, 250);
  };

  const ecoute = etat === "ecoute";
  return (
    <>
      <button
        type="button"
        onClick={() => (ecoute ? void terminer() : void commencer())}
        disabled={etat === "ecriture"}
        aria-pressed={ecoute}
        aria-label={ecoute ? "Terminer la dictée" : "Poser la question à voix haute"}
        className={`inline-flex h-12 items-center gap-2 rounded-full px-4 text-base font-bold disabled:opacity-60 ${ecoute ? "bg-orange text-ink" : "border border-ink"}`}
      >
        {ecoute ? (
          <span aria-hidden="true" className="h-3 w-3 animate-pulse rounded-full bg-[#C2410C]" />
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1A7 7 0 0 0 19 12h-2z" /></svg>
        )}
        {ecoute ? `Terminer (${reste} s)` : etat === "ecriture" ? "Écriture…" : "Dicter"}
      </button>
      <span role="status" className="basis-full text-sm text-[#5C2E00] empty:hidden">
        {ecoute ? "Parlez maintenant, puis touchez « Terminer »." : message}
      </span>
    </>
  );
}
