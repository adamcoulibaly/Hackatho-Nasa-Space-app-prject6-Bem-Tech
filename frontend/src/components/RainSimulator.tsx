"use client";

import { useState } from "react";
import type { Rotation } from "@/lib/contract";
import { scoreWord } from "@/lib/format";
import { simulate } from "@/lib/simulateur";

export function RainSimulator({ rotations, courante }: { rotations: Rotation[]; courante: string }) {
  const [pluie, setPluie] = useState(-20);
  const [chaleur, setChaleur] = useState(0);
  const resultats = rotations.map((r) => ({ r, ...simulate(r, pluie, chaleur) }));
  const total = (x: { secheresse: number; eau: number }) => x.secheresse + x.eau;
  const top = Math.max(...resultats.map(total));
  const gagnantes = resultats.filter((x) => total(x) === top).map((x) => x.r.id);
  const verdict =
    gagnantes.length === resultats.length
      ? "les rotations ne se distinguent plus"
      : gagnantes.length === 1
        ? `la rotation ${gagnantes[0]} résiste le mieux`
        : `les rotations ${gagnantes.join(" et ")} résistent le mieux`;
  const fmt = (n: number, u: string) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)} ${u}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          <span>Variation des pluies : <strong className="font-display">{fmt(pluie, "%")}</strong></span>
          <input type="range" min={-30} max={10} step={5} value={pluie} onChange={(e) => setPluie(Number(e.target.value))} className="h-11 w-full accent-orange" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          <span>Variation de la chaleur : <strong className="font-display">{fmt(chaleur, "°C")}</strong></span>
          <input type="range" min={0} max={4} step={1} value={chaleur} onChange={(e) => setChaleur(Number(e.target.value))} className="h-11 w-full accent-orange" />
        </label>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3" aria-live="polite">
        {resultats.map(({ r, secheresse, eau }) => (
          <div key={r.id} className={`flex flex-col gap-1 rounded-2xl p-3.5 text-sm ${r.id === courante ? "bg-ink text-paper" : "bg-[#F4F6F1]"}`}>
            <strong>Rotation {r.id}</strong>
            <span>Sécheresse : {scoreWord(secheresse)}</span>
            <span>Eau : {scoreWord(eau)}</span>
          </div>
        ))}
      </div>
      <p className="m-0 text-[15px] leading-normal text-muted">
        Dans ce scénario, <strong className="text-ink">{verdict}</strong>. Simulation simple (valeurs d'exemple) : chaque tranche de 15 % de pluie en moins, ou de 2 °C en plus, retire un niveau.
      </p>
    </div>
  );
}
