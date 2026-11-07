"use client";

import { useState } from "react";
import type { Sources } from "@/lib/contract";
import { scoreSegments } from "@/lib/format";

const TAG: Record<Sources["approches"][number]["verdict"], string> = {
  Retenu: "bg-[#D7F0E2] text-[#00502B]",
  Testé: "bg-[#FDE7CC] text-[#7A3D00]",
  Écarté: "bg-[#E7ECE6] text-muted",
};

export function ApproachPicker({ approches }: { approches: Sources["approches"] }) {
  const [id, setId] = useState(approches[0].id);
  const sel = approches.find((a) => a.id === id) ?? approches[0];
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Approches comparées" data-stagger className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {approches.map((a) => {
          const on = a.id === id;
          return (
            <button key={a.id} type="button" aria-pressed={on} onClick={() => setId(a.id)} className={`flex min-h-[44px] flex-col gap-2.5 rounded-3xl border p-[18px] text-left ${on ? "border-ink bg-ink text-paper" : "border-[#E3E8E2] bg-white text-ink"}`}>
              <span className={`self-start rounded-full px-2.5 py-1 text-xs font-bold ${TAG[a.verdict]}`}>{a.verdict}</span>
              <span className="font-display text-base font-bold">{a.nom}</span>
              {([["Explicabilité", a.explicabilite], ["Besoin en données", a.besoinDonnees], ["Précision attendue", a.precision]] as [string, number][]).map(([l, v]) => (
                <span key={l} className="flex flex-col gap-1 text-xs">
                  {l}
                  <span className="flex gap-1" role="img" aria-label={`${l} : ${v} sur 5`}>
                    {scoreSegments(v, on).map((c, i) => <span key={i} className="h-1.5 flex-grow rounded-sm" style={{ background: c }} />)}
                  </span>
                </span>
              ))}
            </button>
          );
        })}
      </div>
      <div className="rounded-3xl bg-white p-6" aria-live="polite">
        <h3 className="m-0 mb-2 font-display text-lg font-bold">{sel.nom} · {sel.role}</h3>
        <p className="m-0 text-base leading-relaxed text-muted">{sel.description}</p>
      </div>
    </div>
  );
}
