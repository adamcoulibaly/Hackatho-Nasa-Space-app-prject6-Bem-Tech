import type { Couche } from "@/lib/contract";

/** Comment lire une couche NASA de la carte, en mots simples. */
export function GuideCouche({ couche }: { couche: Couche }) {
  const g = couche.guide;
  if (!g) return null;
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-white p-4" aria-label={`Comment lire la couche ${couche.label}`}>
      <div className="flex flex-col gap-1">
        <strong className="text-[15px]">Ce que mesure cette couche</strong>
        <span className="text-[15px] leading-normal">{g.mesure}</span>
        <span className="text-sm text-muted">{`${couche.source}. ${g.finesse}`}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {g.lecture.map((l) => (
          <li key={l.sens} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="h-4 w-7 shrink-0 rounded" style={{ background: l.couleur }} />
            {l.sens}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1 rounded-2xl bg-paper p-3">
        <strong className="text-sm">Pour votre champ</strong>
        <span className="text-sm leading-normal">{g.pourVotreChamp}</span>
      </div>
    </section>
  );
}
