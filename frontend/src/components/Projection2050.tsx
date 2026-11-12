"use client";

import { useState } from "react";
import type { Projection } from "@/lib/contract";

type Scenario = "ssp245" | "ssp585";
const LIBELLE: Record<Scenario, string> = { ssp245: "Modéré", ssp585: "Pessimiste" };

function Barre({ libelle, min, max, total, active, id, mesure }: { libelle: string; min: number; max: number; total: number; active: boolean; id: string; mesure?: boolean }) {
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div data-testid={id} data-active={active} className={`flex flex-col gap-1.5 ${active ? "" : "opacity-55"}`}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{libelle}</span>
        <strong>{min === max ? min : `${min}–${max}`} / {total}</strong>
      </div>
      <div className="relative h-3.5 overflow-hidden rounded-full bg-[#E7ECE6]">
        <div className="seg-grow absolute inset-y-0 left-0 rounded-full" style={{ width: pct(min), background: mesure ? "#07120D" : "#009E60" }} />
        {max > min && <div className="absolute inset-y-0 rounded-full opacity-40" style={{ left: pct(min), width: pct(max - min), background: "#009E60" }} />}
      </div>
    </div>
  );
}

/** Bonnes saisons aujourd'hui (mesuré) et vers 2050, avec la fourchette des 3 modèles climatiques. */
type Horizon = "2030" | "2040" | "2050";

export function Projection2050({ projection, phrase }: { projection: Projection; phrase: string }) {
  const [scenario, setScenario] = useState<Scenario>("ssp245");
  const [horizon, setHorizon] = useState<Horizon>("2050");
  const disponibles = (["2030", "2040", "2050"] as Horizon[]).filter((h) => h === "2050" || projection.horizons?.[h]);
  const parScenario = (horizon === "2050" ? projection.scenarios : projection.horizons?.[horizon]) ?? projection.scenarios;
  const f = parScenario[scenario];
  return (
    <div className="flex flex-col gap-4">
      <span className="self-start rounded-full bg-[#FDE7CC] px-3 py-1 text-[13px] font-bold text-[#5C2E00]">Projection, pas prévision</span>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-paper p-1" role="group" aria-label="Scénario d'émissions">
        {(Object.keys(LIBELLE) as Scenario[]).map((s) => (
          <button key={s} type="button" aria-pressed={s === scenario} onClick={() => setScenario(s)} className={`h-11 rounded-full text-sm font-bold ${s === scenario ? "bg-ink text-paper" : "text-ink"}`}>
            {LIBELLE[s]}
          </button>
        ))}
      </div>
      {disponibles.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Horizon">
          {disponibles.map((h) => (
            <button key={h} type="button" aria-pressed={h === horizon} onClick={() => setHorizon(h)} className={`h-11 rounded-full px-4 text-sm font-bold ${h === horizon ? "bg-orange text-ink" : "border border-line"}`}>{h}</button>
          ))}
        </div>
      )}
      <Barre id="barre-actuel" libelle="aujourd'hui (mesuré)" min={projection.aujourdhui} max={projection.aujourdhui} total={projection.total} active mesure />
      <Barre id="barre-ssp245" libelle={`vers ${horizon} — modéré`} {...parScenario.ssp245} total={projection.total} active={scenario === "ssp245"} />
      <Barre id="barre-ssp585" libelle={`vers ${horizon} — pessimiste`} {...parScenario.ssp585} total={projection.total} active={scenario === "ssp585"} />
      <p className="m-0 text-[15px] leading-normal" aria-live="polite">
        {f.desaccord
          ? `Scénario ${LIBELLE[scenario].toLowerCase()} : les modèles ne s'accordent pas (${f.min} à ${f.max} bonnes saisons sur ${projection.total}).`
          : `Scénario ${LIBELLE[scenario].toLowerCase()} : ${f.min === f.max ? f.min : `${f.min} à ${f.max}`} bonnes saisons sur ${projection.total} vers ${horizon}.`}
      </p>
      <p className="m-0 rounded-2xl bg-paper p-3.5 text-[15px] font-semibold leading-normal">{phrase}</p>
      <p className="m-0 text-xs leading-normal text-muted">
        Source : NASA NEX-GDDP-CMIP6 (25 km, corrigé des biais), modèles IPSL-CM6A-LR, MRI-ESM2-0 et GFDL-ESM4, 1995–2014 puis 2021–2040 (vers 2030), 2031–2050 (vers 2040) et 2041–2060 (vers 2050), scénarios SSP2-4.5 (modéré) et SSP5-8.5 (pessimiste). L&apos;évolution de chaque modèle est appliquée aux saisons réellement mesurées. La pluie future est très incertaine en Afrique de l&apos;Ouest.
      </p>
    </div>
  );
}
