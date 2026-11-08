"use client";

import { useState } from "react";
import type { Climat } from "@/lib/contract";
import { barHeight } from "@/lib/format";

const COULEURS: Record<Climat["onglets"][number]["id"], { on: string; off: string }> = {
  pluie: { on: "#009E60", off: "#C9D3CD" },
  chaleur: { on: "#F77F00", off: "#FDD3A6" },
  sol: { on: "#00703C", off: "#BFE3CF" },
  veg: { on: "#0B5130", off: "#D2BE87" },
};
const INITIALES = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function ClimatTabs({ onglets }: { onglets: Climat["onglets"] }) {
  const [id, setId] = useState(onglets[0].id);
  const o = onglets.find((x) => x.id === id) ?? onglets[0];
  const min = o.min ?? 0;
  const max = Math.max(...o.valeurs);
  const c = COULEURS[o.id];

  return (
    <div className="flex flex-col gap-3.5">
      <div role="group" aria-label="Indicateur" className="grid gap-1 rounded-full bg-[#E3E8E2] p-1" style={{ gridTemplateColumns: `repeat(${onglets.length}, minmax(0, 1fr))` }}>
        {onglets.map((t) => (
          <button key={t.id} type="button" aria-pressed={t.id === id} onClick={() => setId(t.id)} className={`h-11 rounded-full text-[13px] font-bold ${t.id === id ? "bg-ink text-paper" : "bg-transparent text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div key={o.id} className="fade-in flex flex-col gap-3 rounded-[26px] bg-white p-[18px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <span className="font-display text-[26px] font-bold leading-tight tracking-[-0.04em] sm:text-[28px]">{o.big}</span>
          <span className="whitespace-nowrap rounded-full bg-[#E7ECE6] px-[9px] py-1 text-xs font-bold">{o.source}</span>
        </div>
        <span className="text-sm text-muted">{o.legende}</span>
        <div className="grid h-[150px] grid-cols-12 items-end gap-1" role="img" aria-label={`${o.legende} : ${o.valeurs.join(", ")}`}>
          {o.valeurs.map((v, i) => {
            const fort = o.saison ? i >= 4 && i <= 9 : v === max;
            return <div key={i} className="bar-grow rounded-t-md rounded-b-[2px]" style={{ height: barHeight(v - min, max - min || 1, 140), background: fort ? c.on : c.off, ["--i" as string]: i } as React.CSSProperties} />;
          })}
        </div>
        <div className="grid grid-cols-12 gap-1 text-center text-[11px] text-muted" aria-hidden="true">
          {INITIALES.map((m, i) => <span key={i}>{m}</span>)}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-3xl bg-ink px-[18px] py-4 text-paper">
        <span className="text-[13px] font-bold text-orange">À retenir</span>
        <span className="text-[15px] leading-[1.45]">{o.conseil}</span>
      </div>
    </div>
  );
}
