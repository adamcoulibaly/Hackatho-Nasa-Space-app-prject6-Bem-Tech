"use client";

import { useEffect, useRef, useState } from "react";
import { EVENEMENT_HORS_LIGNE, messageHorsLigne } from "@/lib/enLigne";

function IconeHorsLigne() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.2-2.6M14.8 10.3A10 10 0 0 1 19 12.9M2 9.3a15 15 0 0 1 4-2.6M11 5.1A15 15 0 0 1 22 9.3" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Hors connexion : enregistre le mode hors ligne (production), affiche un bandeau tant qu'il n'y a pas internet,
 * « De nouveau en ligne » au retour, et un message quand on touche une fonction qui a besoin d'internet.
 */
export function HorsLigne() {
  const [horsLigne, setHorsLigne] = useState(false);
  const [retour, setRetour] = useState(false);
  const [besoin, setBesoin] = useState<string | null>(null);
  const minuteries = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const plus = (f: () => void, ms: number) => minuteries.current.push(setTimeout(f, ms));
    const maj = (e?: Event) => {
      const hors = !navigator.onLine;
      setHorsLigne(hors);
      if (hors) return setRetour(false);
      if (e?.type === "online") {
        setBesoin(null);
        setRetour(true);
        plus(() => setRetour(false), 3000);
      }
    };
    const surBesoin = (e: Event) => {
      setBesoin((e as CustomEvent<string>).detail);
      plus(() => setBesoin(null), 6000);
    };
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    window.addEventListener(EVENEMENT_HORS_LIGNE, surBesoin);
    const t = minuteries.current;
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
      window.removeEventListener(EVENEMENT_HORS_LIGNE, surBesoin);
      t.forEach(clearTimeout);
    };
  }, []);

  return (
    <>
      {horsLigne && (
        <div role="status" className="fixed inset-x-0 top-0 z-[1200] flex items-center justify-center gap-2 bg-[#3A2208] px-4 py-2 text-center text-sm font-semibold text-[#FFB066]">
          <IconeHorsLigne />
          <span>Vous êtes hors ligne · les dernières données consultées restent disponibles.</span>
        </div>
      )}
      {retour && (
        <div role="status" className="fixed inset-x-0 top-0 z-[1200] bg-green-dark px-4 py-2 text-center text-sm font-semibold text-white">
          De nouveau en ligne
        </div>
      )}
      {besoin && (
        <div role="alert" className="fade-in fixed inset-x-4 bottom-24 z-[1300] mx-auto flex max-w-[460px] items-start gap-3 rounded-2xl bg-ink p-4 text-paper shadow-[0_12px_32px_rgba(7,18,13,0.35)] md:bottom-8">
          <span className="mt-0.5 text-[#FFB066]"><IconeHorsLigne /></span>
          <span className="flex flex-1 flex-col gap-0.5">
            <strong className="text-[15px]">Pas de connexion internet</strong>
            <span className="text-sm text-[#C9D4CD]">{messageHorsLigne(besoin)}</span>
          </span>
          <button type="button" onClick={() => setBesoin(null)} aria-label="Fermer" className="-m-1 h-9 w-9 shrink-0 rounded-full text-lg text-[#C9D4CD]">×</button>
        </div>
      )}
    </>
  );
}
