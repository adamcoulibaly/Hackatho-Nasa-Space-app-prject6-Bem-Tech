"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";

type Role = "agriculteur" | "conseiller";

const ROLES: { id: Role; titre: string; sous: string; href: string }[] = [
  { id: "agriculteur", titre: "Agriculteur", sous: "Mon champ", href: "/parcelle" },
  { id: "conseiller", titre: "Conseiller", sous: "Mes agriculteurs", href: "/conseiller" },
];

export function Bienvenue() {
  const [role, setRole] = useState<Role>("agriculteur");
  const cible = ROLES.find((r) => r.id === role)!;
  return (
    <div data-stagger className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col gap-[18px] bg-ink px-[22px] pb-7 pt-6 text-paper">
      <div className="flex items-center gap-2.5">
        <Logo size={44} />
        <span className="font-display text-[22px] font-bold tracking-[-0.04em]">foro<span className="text-orange">sat</span></span>
      </div>
      <h1 className="m-0 font-display text-[34px] font-bold leading-none tracking-[-0.05em]">
        Lire le ciel pour mieux <span className="font-serif font-normal italic text-orange">cultiver.</span>
      </h1>

      <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
        <legend className="mb-2 p-0 text-[13px] uppercase tracking-[0.12em] text-[#9DB0A5]">Je suis</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => {
            const on = r.id === role;
            return (
              <button key={r.id} type="button" aria-pressed={on} onClick={() => setRole(r.id)} className={`min-h-16 rounded-[18px] px-3.5 text-left text-[15px] font-bold ${on ? "bg-orange text-ink" : "border border-[#2A4234] bg-transparent text-paper"}`}>
                {r.titre}
                <br />
                <span className={`text-[13px] font-medium ${on ? "" : "text-[#9DB0A5]"}`}>{r.sous}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
        <legend className="mb-2 p-0 text-[13px] uppercase tracking-[0.12em] text-[#9DB0A5]">Langue</legend>
        <div className="flex gap-2">
          <button type="button" aria-pressed="true" className="h-[46px] flex-grow rounded-full bg-paper text-[15px] font-bold text-ink">Français</button>
          {["Dioula", "Baoulé"].map((l) => (
            <button key={l} type="button" disabled aria-pressed="false" className="min-h-[46px] flex-grow rounded-full border border-[#2A4234] bg-transparent text-[15px] font-semibold text-[#9DB0A5]">
              {l}
              <span className="block text-[11px] font-normal">bientôt</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex-grow" />
      <Link href={cible.href} className="flex h-[58px] items-center justify-center rounded-full bg-orange text-[17px] font-bold text-ink no-underline hover:text-ink">Commencer</Link>
      <span className="text-center text-[13px] text-[#9DB0A5]">Projet NASA Space Apps 2026 · BEM TECH</span>
    </div>
  );
}
