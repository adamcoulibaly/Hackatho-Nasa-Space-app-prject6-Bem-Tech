import Link from "next/link";

export type BottomTab = "tableau" | "climat" | "rotations" | "champ";

const TABS: { id: BottomTab; label: string; href: string; icon: string }[] = [
  { id: "tableau", label: "Accueil", href: "/tableau", icon: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { id: "climat", label: "Climat", href: "/climat", icon: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" },
  { id: "rotations", label: "Rotations", href: "/rotations", icon: "M4 7h11M4 12h16M4 17h8" },
  { id: "champ", label: "Champ", href: "/parcelle", icon: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" },
];

/** Barre de navigation du bas, visible seulement sur téléphone. */
export function BottomNav({ current }: { current?: BottomTab }) {
  return (
    <nav aria-label="Navigation" className="no-print fixed inset-x-4 bottom-4 z-[1100] grid h-[66px] grid-cols-4 gap-1 rounded-full bg-ink p-1.5 md:hidden">
      {TABS.map((t) => {
        const on = t.id === current;
        return (
          <Link key={t.id} href={t.href} aria-current={on ? "page" : undefined} className={`flex flex-col items-center justify-center gap-0.5 rounded-full text-[11px] no-underline ${on ? "bg-paper font-bold text-ink hover:text-ink" : "font-semibold text-[#C9D4CD] hover:text-paper"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={t.icon} /></svg>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
