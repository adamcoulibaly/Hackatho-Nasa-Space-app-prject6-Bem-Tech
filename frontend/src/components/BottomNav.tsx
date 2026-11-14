"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type BottomTab = "tableau" | "climat" | "rotations" | "champ";

const TABS: { id: BottomTab; label: string; href: string; icon: string }[] = [
  { id: "tableau", label: "Accueil", href: "/tableau", icon: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { id: "climat", label: "Climat", href: "/climat", icon: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" },
  { id: "rotations", label: "Rotations", href: "/rotations", icon: "M4 7h11M4 12h16M4 17h8" },
  { id: "champ", label: "Champ", href: "/parcelle", icon: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" },
];
const CLE = "forosat.onglet";

/**
 * Barre de navigation du bas, visible seulement sur téléphone. La pastille claire glisse depuis l'onglet
 * précédent jusqu'à l'onglet ouvert (chaque page a sa barre : l'onglet précédent est gardé pour la session).
 */
export function BottomNav({ current }: { current?: BottomTab }) {
  const index = Math.max(0, TABS.findIndex((t) => t.id === current));
  const [position, setPosition] = useState(index);
  useEffect(() => {
    let precedent = index;
    try {
      const brut = sessionStorage.getItem(CLE);
      const v = brut === null ? NaN : Number(brut);
      if (Number.isInteger(v) && v >= 0 && v < TABS.length) precedent = v;
      sessionStorage.setItem(CLE, String(index));
    } catch {
      /* stockage indisponible */
    }
    if (precedent === index) return setPosition(index);
    setPosition(precedent);
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setPosition(index)));
    return () => cancelAnimationFrame(r);
  }, [index]);
  return (
    <nav aria-label="Navigation" className="no-app no-print fixed inset-x-4 bottom-4 z-[1100] h-[66px] rounded-full bg-ink p-1.5 shadow-[0_10px_30px_rgba(7,18,13,0.25)] md:hidden">
      <div className="relative grid h-full grid-cols-4 gap-1">
        {current && (
          <span
            data-indicateur
            aria-hidden="true"
            style={{ ["--onglet" as string]: String(position) } as React.CSSProperties}
            className="indicateur-onglet absolute inset-y-0 left-0 w-[calc((100%-12px)/4)] rounded-full bg-paper"
          />
        )}
        {TABS.map((t) => {
          const on = t.id === current;
          return (
            <Link key={t.id} href={t.href} aria-current={on ? "page" : undefined} className={`relative flex flex-col items-center justify-center gap-0.5 rounded-full text-[11px] no-underline transition-colors duration-200 ${on ? "font-bold text-ink hover:text-ink" : "font-semibold text-[#C9D4CD] hover:text-paper"}`}>
              <svg className={on ? "icone-active" : undefined} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
