import Link from "next/link";
import { Logo } from "./Logo";
import { FermerMenus } from "./FermerMenus";
import { Chevron } from "./Chevron";

export type Step = "parcelle" | "climat" | "rotations" | "simulateur" | "risques" | "tableau" | "lexique";

type Entree = { id?: Step; label: string; href: string };

/** Trois espaces : décider de sa rotation, suivre sa saison, comprendre les données. */
const ESPACES: { titre: string; sous: string; liens: Entree[] }[] = [
  {
    titre: "Décider",
    sous: "Choisir sa rotation",
    liens: [
      { id: "parcelle", label: "Parcelle", href: "/parcelle" },
      { id: "rotations", label: "Rotations", href: "/rotations" },
      { id: "simulateur", label: "Simuler sur plusieurs années", href: "/simulateur" },
    ],
  },
  {
    titre: "Suivre ma saison",
    sous: "Au jour le jour",
    liens: [
      { id: "tableau", label: "Tableau de bord", href: "/tableau" },
      { label: "Ma parcelle aujourd'hui", href: "/aujourdhui" },
      { label: "Calendrier agricole", href: "/calendrier" },
      { label: "Carnet de suivi", href: "/suivi" },
    ],
  },
  {
    titre: "Comprendre",
    sous: "Les données NASA",
    liens: [
      { id: "climat", label: "Climat", href: "/climat" },
      { id: "risques", label: "Carte des risques", href: "/risques" },
      { label: "Méthode et sources", href: "/methode" },
      { id: "lexique", label: "Lexique", href: "/lexique" },
      { label: "Guide d'utilisation", href: "/guide" },
      { label: "Traduire ForoSat", href: "/traduire" },
    ],
  },
];

/** `bottomNav` : la barre du bas remplace la navigation du haut sur téléphone. */
export function SiteHeader({ current, badge, bottomNav = false }: { current?: Step; badge?: string; bottomNav?: boolean }) {
  return (
    <header className="no-app bg-ink text-paper no-print">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-7 gap-y-3 px-6 py-3">
        <Link href="/" aria-label="ForoSat — accueil" className="flex items-center gap-2.5 no-underline text-paper hover:text-paper">
          <Logo />
          <span className="font-display text-[19px] font-bold tracking-[-0.04em]">
            foro<span className="text-orange">sat</span>
          </span>
        </Link>
        <nav aria-label="Étapes" className={`${bottomNav ? "max-md:hidden " : ""}flex flex-grow flex-wrap gap-1`}>
          {ESPACES.map((e) => {
            const actif = e.liens.some((l) => l.id && l.id === current);
            return (
              <details key={e.titre} data-menu className="group relative">
                <summary className={`inline-flex min-h-[44px] cursor-pointer select-none list-none items-center gap-1.5 rounded-full pl-3.5 pr-3 text-sm transition-colors duration-150 [&::-webkit-details-marker]:hidden ${actif ? "bg-paper font-bold text-ink" : "text-[#C9D4CD] hover:bg-[#1C3327] hover:text-paper group-open:bg-[#1C3327] group-open:text-paper"}`}>
                  {e.titre}
                  <Chevron taille={14} className="opacity-80" />
                </summary>
                <div className="fade-in absolute left-0 top-full z-[1300] mt-2 flex w-64 flex-col rounded-2xl bg-paper p-2 shadow-[0_16px_40px_rgba(7,18,13,0.25)]">
                  <span className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{e.sous}</span>
                  {e.liens.map((l) => {
                    const ici = !!l.id && l.id === current;
                    return (
                      <Link key={l.href} href={l.href} aria-current={ici ? "page" : undefined} className={`rounded-xl px-3 py-2.5 text-[15px] text-ink no-underline hover:bg-white hover:text-ink ${ici ? "bg-white font-bold" : ""}`}>
                        {l.label}
                      </Link>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </nav>
        <FermerMenus />
        {badge && <span className="rounded-full border border-[#2A4234] px-3.5 py-2.5 text-sm">{badge}</span>}
      </div>
    </header>
  );
}
