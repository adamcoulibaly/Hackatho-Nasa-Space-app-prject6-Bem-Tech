import Link from "next/link";
import { CRITERES, CRITERE_LABELS, type Rotation } from "@/lib/contract";
import { ScoreBar } from "./ScoreBar";
import { IconeCulture } from "./plantes";

export function RotationCard({ rotation, dark = false }: { rotation: Rotation; dark?: boolean }) {
  const r = rotation;
  const muted = dark ? "text-[#C9D4CD]" : "text-muted";
  return (
    <article data-guide={r.recommandee ? "rotation-conseillee" : undefined} className={`lift flex min-w-0 flex-col gap-5 rounded-[28px] p-5 sm:p-[26px] ${dark ? "bg-ink text-paper" : "bg-white text-ink"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`font-display text-[40px] font-extrabold leading-none tracking-[-0.05em] ${r.recommandee ? "text-orange" : dark ? "text-paper" : "text-muted"}`}>{r.id}</span>
        <span className="flex flex-wrap justify-end gap-1.5">
          {r.tient2050 && <span className="rounded-full bg-green px-3 py-1.5 text-[13px] font-bold text-ink">Tient en 2050</span>}
          <span className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${r.recommandee ? "bg-orange text-ink" : "bg-[#E7ECE6] text-ink"}`}>
            {r.recommandee ? "Recommandée" : r.tag}
          </span>
        </span>
      </div>
      <div data-testid="sequence" className="flex flex-wrap items-center gap-1.5 font-display text-xl font-bold tracking-[-0.02em]">
        {r.sequence.map((c, i) => (
          <span key={c + i} className="contents">
            <span className="inline-flex items-center gap-1.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF3EC]"><IconeCulture culture={c} taille={30} /></span>{c}</span>
            {i < r.sequence.length - 1 && <span className={`text-xl font-normal ${muted}`} aria-hidden="true">→</span>}
          </span>
        ))}
      </div>
      <ul className="m-0 grid grid-cols-1 gap-x-4 gap-y-3 p-0 min-[400px]:grid-cols-2">
        {CRITERES.map((k) => <ScoreBar key={k} label={CRITERE_LABELS[k]} level={r.scores[k]} dark={dark} />)}
      </ul>
      <p className={`m-0 text-[15px] leading-normal ${muted}`}>{r.note}</p>
      {r.rejeu && r.rejeu.total > 0 && (
        <p className="m-0 text-[15px] font-semibold">{`${r.rejeu.total} saisons réelles rejouées : ${r.rejeu.bonnes} bonnes`}</p>
      )}
      <p className={`m-0 flex-grow text-sm leading-normal ${muted}`}><strong className={dark ? "text-paper" : "text-ink"}>Lacune :</strong> {r.lacune}</p>
      <div className={`flex items-center justify-between gap-2.5 border-t pt-4 ${dark ? "border-[#1F3328]" : "border-[#E3E8E2]"}`}>
        <span className={`text-sm ${muted}`}>Confiance : <strong className={dark ? "text-paper" : "text-ink"}>{r.confiance.niveau}</strong></span>
        <Link
          href={`/rotations/${r.id}`}
          data-guide={r.recommandee ? "detail-conseille" : undefined}
          aria-label={`Voir le détail de la rotation ${r.id}`}
          className={`inline-flex h-[46px] shrink-0 items-center whitespace-nowrap rounded-full px-[18px] text-[15px] font-bold no-underline ${dark ? "bg-orange text-ink hover:text-ink" : "bg-ink text-paper hover:text-paper"}`}
        >
          Voir le détail
        </Link>
      </div>
    </article>
  );
}
