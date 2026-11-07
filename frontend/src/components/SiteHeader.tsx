import Link from "next/link";
import { Logo } from "./Logo";

export type Step = "parcelle" | "climat" | "rotations" | "lexique";

const STEPS: { id: Step; label: string; href: string }[] = [
  { id: "parcelle", label: "1 · Parcelle", href: "/parcelle" },
  { id: "climat", label: "2 · Climat", href: "/climat" },
  { id: "rotations", label: "3 · Rotations", href: "/rotations" },
  { id: "lexique", label: "Lexique", href: "/lexique" },
];

export function SiteHeader({ current, badge }: { current?: Step; badge?: string }) {
  return (
    <header className="bg-ink text-paper no-print">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-7 gap-y-3 px-6 py-3">
        <Link href="/" aria-label="ForoSat — accueil" className="flex items-center gap-2.5 no-underline text-paper hover:text-paper">
          <Logo />
          <span className="font-display text-[19px] font-bold tracking-[-0.04em]">
            foro<span className="text-orange">sat</span>
          </span>
        </Link>
        <nav aria-label="Étapes" className="flex flex-grow flex-wrap gap-1">
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
        </nav>
        {badge && <span className="rounded-full border border-[#2A4234] px-3.5 py-2.5 text-sm">{badge}</span>}
      </div>
    </header>
  );
}
