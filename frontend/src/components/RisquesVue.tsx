"use client";

import { useState } from "react";
import { CarteRisques } from "./CarteRisques";
import { COULEUR_RISQUE, ListeRisques, type Horizon, type RisqueAffiche } from "./ListeRisques";

/** Carte et liste des risques, aujourd'hui (pertes mesurées) ou vers 2050 (pertes estimées). */
export function RisquesVue({ regions }: { regions: RisqueAffiche[] }) {
  const [horizon, setHorizon] = useState<Horizon>("aujourdhui");
  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Horizon de la carte">
        {([["aujourdhui", "Aujourd'hui (mesuré)"], ["2050", "Vers 2050 (estimé)"]] as [Horizon, string][]).map(([h, l]) => (
          <button key={h} type="button" aria-pressed={h === horizon} onClick={() => setHorizon(h)} className={`h-11 rounded-full px-4 text-sm font-bold ${h === horizon ? "bg-ink text-paper" : "border border-line"}`}>{l}</button>
        ))}
      </div>
      <CarteRisques regions={regions} horizon={horizon} />
      <div className="flex flex-wrap gap-4 text-sm">
        {(["faible", "moyen", "eleve"] as const).map((n) => (
          <span key={n} className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: COULEUR_RISQUE[n] }} />
            {`${n === "faible" ? "Faible : moins de 10 %" : n === "moyen" ? "Moyen : 10 à 25 %" : "Élevé : plus de 25 %"} de saisons perdues${horizon === "2050" ? " (estimées)" : ""}`}
          </span>
        ))}
      </div>
      <ListeRisques regions={regions} horizon={horizon} />
    </>
  );
}
