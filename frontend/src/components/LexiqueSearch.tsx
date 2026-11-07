"use client";

import { useState } from "react";
import type { Terme } from "@/lib/contract";
import { filterLexique } from "@/lib/lexique";

export function LexiqueSearch({ termes }: { termes: Terme[] }) {
  const [q, setQ] = useState("");
  const liste = filterLexique(termes, q);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="lex" className="text-sm font-semibold">Rechercher un mot</label>
        <input id="lex" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex. NDVI, azote, pluie…" className="h-[52px] max-w-xl rounded-full border border-line bg-white px-5 text-base" />
      </div>
      {liste.length === 0 ? (
        <div role="status" className="flex flex-col items-start gap-3 rounded-3xl bg-white p-6">
          <p className="m-0 text-base">Aucun terme ne correspond à « {q} ».</p>
          <button type="button" onClick={() => setQ("")} className="h-11 rounded-full bg-ink px-5 text-sm font-bold text-paper">Effacer la recherche</button>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5 p-0">
          {liste.map((t, i) => (
            <li key={t.terme} className={`flex flex-col gap-2.5 rounded-3xl p-[22px] ${i === 0 && !q ? "bg-ink text-paper" : "bg-white"}`}>
              <span className={`self-start rounded-full px-2.5 py-1 text-xs font-bold ${i === 0 && !q ? "bg-orange text-ink" : "bg-[#E7ECE6] text-ink"}`}>{t.tag}</span>
              <h2 className="m-0 font-display text-lg font-bold tracking-[-0.02em]">{t.terme}</h2>
              <p className="m-0 text-[15px] leading-normal">{t.definition}</p>
              <p className={`m-0 text-sm leading-normal ${i === 0 && !q ? "text-[#C9D4CD]" : "text-muted"}`}>{t.pourquoi}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
