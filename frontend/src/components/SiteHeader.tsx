import Link from "next/link";
import { Logo } from "./Logo";

export type Step = "parcelle" | "climat" | "rotations" | "simulateur" | "risques" | "tableau" | "lexique";

/** Navigation principale courte ; le reste dans « Plus ». */
const STEPS: { id: Step; label: string; href: string }[] = [
  { id: "parcelle", label: "Parcelle", href: "/parcelle" },
  { id: "rotations", label: "Rotations", href: "/rotations" },
  { id: "climat", label: "Climat", href: "/climat" },
  { id: "tableau", label: "Tableau de bord", href: "/tableau" },
];
const PLUS: { id?: Step; label: string; href: string }[] = [
  { id: "simulateur", label: "Simulateur", href: "/simulateur" },
  { id: "risques", label: "Carte des risques", href: "/risques" },
  { label: "Calendrier agricole", href: "/calendrier" },
  { label: "Carnet de suivi", href: "/suivi" },
  { id: "lexique", label: "Lexique", href: "/lexique" },
  { label: "Méthode et sources", href: "/methode" },
  { label: "Guide d'utilisation", href: "/guide" },
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
          {STEPS.map((s) => {
            const active = s.id === current;
            return (
              <Link
                key={s.id}
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-[44px] items-center rounded-full px-3.5 text-sm no-underline ${
                  active ? "bg-paper font-bold text-ink hover:text-ink" : "text-[#C9D4CD] hover:text-paper"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
          <details className="group relative">
            <summary className={`inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1 rounded-full px-3.5 text-sm [&::-webkit-details-marker]:hidden ${PLUS.some((p) => p.id && p.id === current) ? "bg-paper font-bold text-ink" : "text-[#C9D4CD] hover:text-paper"}`}>
              Plus <span aria-hidden="true" className="transition-transform duration-200 group-open:rotate-180">⌄</span>
            </summary>
            <div className="fade-in absolute left-0 top-full z-[1300] mt-2 flex w-60 flex-col rounded-2xl bg-paper p-2 shadow-[0_16px_40px_rgba(7,18,13,0.25)]">
              {PLUS.map((p) => (
                <Link key={p.href} href={p.href} aria-current={p.id && p.id === current ? "page" : undefined} className="rounded-xl px-3 py-2.5 text-[15px] text-ink no-underline hover:bg-white hover:text-ink">
                  {p.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        {badge && <span className="rounded-full border border-[#2A4234] px-3.5 py-2.5 text-sm">{badge}</span>}
      </div>
    </header>
  );
}
