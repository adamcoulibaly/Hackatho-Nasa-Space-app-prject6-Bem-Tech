import { scoreSegments, scoreWord } from "@/lib/format";

export function ScoreBar({ label, level, dark = false }: { label: string; level: number; dark?: boolean }) {
  return (
    <li className="m-0 flex list-none flex-col gap-1.5">
      <div className="flex justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="font-bold">{scoreWord(level)}</span>
      </div>
      <div className="flex gap-1" role="img" aria-label={`${label} : ${scoreWord(level)}, ${level} sur 5`}>
        {scoreSegments(level, dark).map((c, i) => (
          <div key={i} className="h-2 flex-grow rounded-[3px]" style={{ background: c }} />
        ))}
      </div>
    </li>
  );
}
