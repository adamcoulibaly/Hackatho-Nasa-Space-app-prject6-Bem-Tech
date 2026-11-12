"use client";

import { useEffect, useState } from "react";
import { ecouterNatif, envoyerAuNatif, estModeApp, type EtatAlerte } from "@/lib/modeApp";

/** Dans l'app mobile seulement : interrupteur de l'alerte « semez maintenant » et bouton de test. */
export function AlerteSemis() {
  const [dansApp, setDansApp] = useState(false);
  const [etat, setEtat] = useState<EtatAlerte>("inactive");
  useEffect(() => {
    setDansApp(estModeApp() && !!(window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);
    return ecouterNatif((m) => {
      if (m.type === "alerte") setEtat(m.etat);
    });
  }, []);
  if (!dansApp) return null;
  const active = etat === "active";
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <strong className="text-[15px]">M&apos;alerter (semis, sécheresse, fortes pluies)</strong>
          <span className="text-[13px] text-muted">Notification quand les pluies s&apos;installent, en cas de sécheresse ou de fortes pluies, avec un conseil (NASA POWER, 2 fois par jour).</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="M'alerter (semis, sécheresse, fortes pluies)"
          onClick={() => envoyerAuNatif({ type: "alerte", action: active ? "desactiver" : "activer" })}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-150 ${active ? "bg-green" : "bg-[#C9D3CD]"}`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-[left] duration-150 ${active ? "left-7" : "left-1"}`} />
        </button>
      </div>
      {etat === "refus" && <p className="m-0 text-sm text-orange-dark">Notifications refusées : activez-les dans les réglages du téléphone.</p>}
      <button type="button" onClick={() => envoyerAuNatif({ type: "alerte", action: "tester" })} className="h-11 self-start rounded-full border border-line px-4 text-sm font-semibold">
        Tester l&apos;alerte
      </button>
    </section>
  );
}
