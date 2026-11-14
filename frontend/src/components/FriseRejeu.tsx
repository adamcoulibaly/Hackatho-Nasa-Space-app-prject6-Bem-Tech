"use client";

import { useState } from "react";
import type { Rejeu } from "@/lib/contract";
import { Compteur } from "./Compteur";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const COULEUR = { bonne: "#009E60", difficile: "#F77F00", perdue: "#C2410C" } as const;
const MOT = { bonne: "bonne", difficile: "difficile", perdue: "perdue" } as const;

const dateLisible = (iso: string) => {
  const [, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]}`;
};

/** Les saisons réelles rejouées pour une rotation : une pastille par saison, le détail au toucher. */
export function FriseRejeu({ rejeu }: { rejeu: Rejeu }) {
  const [choix, setChoix] = useState<number | null>(rejeu.pire?.annee ?? null);
  const detail = rejeu.saisons.find((s) => s.annee === choix);
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 font-display text-[26px] font-bold leading-tight tracking-[-0.03em]">
        <Compteur valeur={rejeu.bonnes} format={(n) => `${n} bonnes saisons sur ${rejeu.total}`} />
      </p>
      {rejeu.rendementMoyen !== undefined && (
        <p className="m-0 text-[15px] font-semibold">{`Rendement estimé : ${rejeu.rendementMoyen} % du potentiel en moyenne`}</p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COULEUR.bonne }} />Bonne ({rejeu.bonnes})</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COULEUR.difficile }} />Difficile ({rejeu.difficiles})</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COULEUR.perdue }} />Perdue ({rejeu.perdues})</span>
      </div>
      <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Saisons rejouées, de la plus ancienne à la plus récente">
        {rejeu.saisons.map((s, i) => (
          <li key={s.annee}>
            <button
              type="button"
              aria-pressed={s.annee === choix}
              aria-label={`${s.annee} : saison ${MOT[s.verdict]}, ${s.culture.toLowerCase()}`}
              onClick={() => setChoix(s.annee)}
              className="flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold text-muted aria-pressed:bg-[#E7ECE6] aria-pressed:text-ink"
            >
              <span className="seg-grow h-[18px] w-[18px] rounded-full" style={{ background: COULEUR[s.verdict], ["--i" as string]: i } as React.CSSProperties} />
              {String(s.annee).slice(2)}
            </button>
          </li>
        ))}
      </ol>
      {detail && (
        <p className="m-0 rounded-2xl bg-paper p-3.5 text-[15px] leading-normal" aria-live="polite">
          <strong>{`${detail.annee} · ${detail.culture} : saison ${MOT[detail.verdict]}. `}</strong>
          {detail.semis ? `Semis le ${dateLisible(detail.semis)} ; ${detail.cause}.` : `Pas de semis possible : ${detail.cause}.`}
          {detail.rendement !== undefined && ` Rendement estimé ${detail.rendement} % du potentiel.`}
        </p>
      )}
      <p className="m-0 text-xs leading-normal text-muted">
        Source : NASA POWER, journalier, 2005–2025 (pluie, températures), besoins en eau FAO-56, rendement relatif selon FAO-33 (en % du potentiel, sans engrais ni ravageurs ; une saison perdue est comptée à 30 % au plus). Hypothèse : réservoir du sol de 100 mm d&apos;eau utile, faute de mesure de votre parcelle. La pluie NASA est moyennée sur environ 50 km : les poches sèches locales peuvent être sous-estimées.
      </p>
    </div>
  );
}
