"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoAnime } from "./LogoAnime";

type Role = "agriculteur" | "conseiller";

const ROLES: { id: Role; titre: string; sous: string; href: string }[] = [
  { id: "agriculteur", titre: "Agriculteur", sous: "Mon champ", href: "/parcelle" },
  { id: "conseiller", titre: "Conseiller", sous: "Mes agriculteurs", href: "/conseiller" },
];

const ATOUTS = [
  "20 ans de mesures NASA pour votre région",
  "3 rotations comparées et expliquées",
  "Alertes de semis, de sécheresse et de chaleur",
];

/**
 * Écran d'entrée. Sur téléphone : une colonne plein écran (comme l'app). Sur ordinateur : la présentation à gauche,
 * les choix dans un panneau à droite, sur toute la largeur de la fenêtre.
 */
export function Bienvenue() {
  const [role, setRole] = useState<Role>("agriculteur");
  const cible = ROLES.find((r) => r.id === role)!;
  return (
    <div className="min-h-screen w-full bg-ink text-paper">
      <div data-stagger className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col gap-[18px] px-[22px] pb-7 pt-6 md:max-w-[1200px] md:grid md:grid-cols-[1.15fr_1fr] md:items-center md:gap-16 md:px-12 md:py-16">
        <div className="flex flex-col gap-[18px] md:gap-7">
          <div className="flex items-center gap-2.5">
            <LogoAnime size={44} />
            <span className="font-display text-[22px] font-bold tracking-[-0.04em]">foro<span className="text-orange">sat</span></span>
          </div>
          <h1 className="m-0 font-display text-[34px] font-bold leading-none tracking-[-0.05em] md:text-[clamp(48px,5.2vw,76px)]">
            Lire le ciel pour mieux <span className="font-serif font-normal italic text-orange">cultiver.</span>
          </h1>
          <p className="m-0 hidden max-w-[520px] text-lg leading-normal text-[#C9D4CD] md:block">
            ForoSat aide les agriculteurs à choisir la rotation des cultures qui tient sur leur parcelle, à partir des données satellite de la NASA, en français et sur téléphone. Né en Côte d'Ivoire, il fonctionne partout : choisissez votre champ sur la carte du monde.
          </p>
          <ul className="m-0 hidden list-none flex-col gap-3 p-0 md:flex">
            {ATOUTS.map((a) => (
              <li key={a} className="flex items-center gap-3 text-[17px]">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-grow flex-col gap-[18px] md:flex-grow-0 md:rounded-[32px] md:border md:border-[#2A4234] md:bg-[#0E1F17] md:p-9">
          <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
            <legend className="mb-2 p-0 text-[13px] uppercase tracking-[0.12em] text-[#9DB0A5]">Je suis</legend>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              {ROLES.map((r) => {
                const on = r.id === role;
                return (
                  <button key={r.id} type="button" aria-pressed={on} onClick={() => setRole(r.id)} className={`min-h-16 rounded-[18px] px-3.5 text-left text-[15px] font-bold md:min-h-[84px] md:px-5 md:text-[17px] ${on ? "bg-orange text-ink" : "border border-[#2A4234] bg-transparent text-paper"}`}>
                    {r.titre}
                    <br />
                    <span className={`text-[13px] font-medium md:text-sm ${on ? "" : "text-[#9DB0A5]"}`}>{r.sous}</span>
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
            <Link href="/traduire" className="text-[13px] font-semibold text-[#C9D4CD]">Vous parlez dioula ou baoulé ? Aidez-nous à traduire →</Link>
          </fieldset>

          <div className="flex-grow md:hidden" />
          <Link href={cible.href} className="flex h-[58px] items-center justify-center rounded-full bg-orange text-[17px] font-bold text-ink no-underline hover:text-ink md:mt-2">Commencer</Link>
          <span className="text-center text-[13px] text-[#9DB0A5]">Projet NASA Space Apps 2026 · BEM TECH</span>
        </div>
      </div>
    </div>
  );
}
