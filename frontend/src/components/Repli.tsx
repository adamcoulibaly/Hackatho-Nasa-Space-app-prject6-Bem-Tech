import { Chevron } from "./Chevron";

/** Section repliée : le titre seul, le contenu au toucher (allège les pages). */
export function Repli({ titre, sous, children }: { titre: string; sous?: string; children: React.ReactNode }) {
  return (
    <details className="group min-w-0 rounded-[28px] bg-white">
      <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-[26px] [&::-webkit-details-marker]:hidden">
        <span className="flex flex-col gap-0.5">
          <span className="font-display text-lg font-bold tracking-[-0.02em]">{titre}</span>
          {sous && <span className="text-sm text-muted">{sous}</span>}
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink transition-colors duration-150 group-hover:bg-[#E7ECE6]">
          <Chevron taille={18} />
        </span>
      </summary>
      <div className="fade-in flex flex-col gap-4 px-5 pb-5 sm:px-[26px] sm:pb-[26px]">{children}</div>
    </details>
  );
}
