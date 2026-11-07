import Link from "next/link";
import { CRITERES, CRITERE_LABELS, type Rotation } from "@/lib/contract";
import { ScoreBar } from "./ScoreBar";

export function RotationCard({ rotation, dark = false }: { rotation: Rotation; dark?: boolean }) {
  const r = rotation;
  const muted = dark ? "text-[#C9D4CD]" : "text-muted";
  return (
    <article className={`lift flex flex-col gap-5 rounded-[28px] p-[26px] ${dark ? "bg-ink text-paper" : "bg-white text-ink"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-display text-[40px] font-extrabold leading-none tracking-[-0.05em] ${r.recommandee ? "text-orange" : dark ? "text-paper" : "text-muted"}`}>{r.id}</span>
        <span className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${r.recommandee ? "bg-orange text-ink" : "bg-[#E7ECE6] text-ink"}`}>
          {r.recommandee ? "Recommandée" : r.tag}
        </span>
      </div>
      <div data-testid="sequence" className="flex flex-wrap items-center gap-1.5 font-display text-xl font-bold tracking-[-0.02em]">
        {r.sequence.map((c, i) => (
          <span key={c + i} className="contents">
            <span>{c}</span>
            {i < r.sequence.length - 1 && <span className={`text-xl font-normal ${muted}`} aria-hidden="true">→</span>}
          </span>
        ))}
      </div>
      <ul className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 p-0">
        {CRITERES.map((k) => <ScoreBar key={k} label={CRITERE_LABELS[k]} level={r.scores[k]} dark={dark} />)}
      </ul>
      <p className={`m-0 text-[15px] leading-normal ${muted}`}>{r.note}</p>
      <p className={`m-0 flex-grow text-sm leading-normal ${muted}`}><strong className={dark ? "text-paper" : "text-ink"}>Lacune :</strong> {r.lacune}</p>
      <div className={`flex items-center justify-between gap-2.5 border-t pt-4 ${dark ? "border-[#1F3328]" : "border-[#E3E8E2]"}`}>
        <span className={`text-sm ${muted}`}>Confiance : <strong className={dark ? "text-paper" : "text-ink"}>{r.confiance.niveau}</strong></span>
        <Link
          href={`/rotations/${r.id}`}
          aria-label={`Voir le détail de la rotation ${r.id}`}
          className={`inline-flex h-[46px] items-center rounded-full px-[18px] text-[15px] font-bold no-underline ${dark ? "bg-orange text-ink hover:text-ink" : "bg-ink text-paper hover:text-paper"}`}
        >
          Voir le détail
        </Link>
      </div>
    </article>
  );
}
