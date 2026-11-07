"use client";

import { useMemo, useState } from "react";
import type { Couche } from "@/lib/contract";
import { mosaic, MOSAIC_COLS } from "@/lib/mosaic";

export function LayerMap({ couches, surface }: { couches: Couche[]; surface: number }) {
  const [id, setId] = useState<Couche["id"]>(couches[0].id);
  const [year, setYear] = useState(2025);
  const couche = couches.find((c) => c.id === id) ?? couches[0];
  const cells = useMemo(() => mosaic(couche, year), [couche, year]);
  const legende = [0, 2, 3, 4, 5, 7].map((i) => couche.palette[i]);

  return (
    <div className="relative min-w-0 flex-[999_1_560px] overflow-hidden rounded-[28px] bg-[#0B1A13] p-2.5">
      <div role="img" aria-label={`Carte simulée : ${couche.label}, année ${year}`} className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${MOSAIC_COLS}, minmax(0, 1fr))` }}>
        {cells.map((c, i) => (
          <div key={i} className="aspect-square rounded-[1px]" style={{ background: c }} />
        ))}
      </div>
      <div className="pointer-events-none absolute border-2 border-paper bg-paper/10" style={{ left: "38%", top: "36%", width: "20%", height: "22%", borderRadius: 4 }} />
      <span className="absolute rounded-full bg-paper px-2.5 py-1.5 text-[13px] font-bold text-ink" style={{ left: "38%", top: "calc(36% - 38px)" }}>
        Ma parcelle · {Number.isFinite(surface) ? surface : "?"} ha
      </span>
      <span className="absolute left-6 top-6 rounded-full bg-ink px-3.5 py-2 text-xs text-[#C9D4CD]">Carte simulée · valeurs d'exemple</span>

      <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-end justify-between gap-2.5">
        <div role="group" aria-label="Couche de la carte" className="flex flex-wrap gap-1 rounded-full bg-ink p-1">
          {couches.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === id}
              onClick={() => setId(c.id)}
              className={`h-11 rounded-full px-3.5 text-[13px] font-bold ${c.id === id ? "bg-paper text-ink" : "bg-transparent text-paper"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2.5 rounded-2xl bg-ink px-3.5 py-2.5 text-[13px] text-paper">
            <label htmlFor="annee">Année <strong className="font-display">{year}</strong></label>
            <input id="annee" type="range" min={2005} max={2025} value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-[130px] accent-orange" />
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-ink px-3.5 py-2.5 text-[13px] text-paper">
            <span className="text-[#9DB0A5]">{couche.source}</span>
            <div className="flex gap-0.5" aria-hidden="true">
              {legende.map((c, i) => <div key={i} className="h-2.5 w-4" style={{ background: c }} />)}
            </div>
            <span>{couche.echelle}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
