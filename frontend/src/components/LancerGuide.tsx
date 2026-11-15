"use client";

import { demarrerGuide } from "@/lib/guide";
import { ouvrirDansApp } from "@/lib/modeApp";

/** Relance le guide pas à pas et ouvre sa première page (dans l'app : l'onglet Champ). */
export function LancerGuide({ className, children = "Lancer le guide pas à pas" }: { className: string; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        demarrerGuide();
        if (window.location.pathname === "/parcelle") return;
        if (!ouvrirDansApp("/parcelle")) window.location.assign("/parcelle");
      }}
    >
      {children}
    </button>
  );
}
