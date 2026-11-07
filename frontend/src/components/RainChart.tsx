import { barHeight } from "@/lib/format";

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export function RainChart({ mois, saisons }: { mois: number[]; saisons: { debut: number; fin: number }[] }) {
  const max = Math.max(...mois);
  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-[640px]">
        {saisons.map((s) => (
          <div
            key={s.debut}
            aria-hidden="true"
            className="absolute bottom-7 top-0 rounded-[14px] bg-[#EAF6EF]"
            style={{ left: `${((s.debut - 1) / 12) * 100}%`, width: `${((s.fin - s.debut + 1) / 12) * 100}%` }}
          />
        ))}
        <div className="relative grid h-[220px] grid-cols-12 items-end gap-2.5 px-2">
          {mois.map((v, i) => {
            const m = i + 1;
            const enSaison = saisons.some((s) => m >= s.debut && m <= s.fin);
            return (
              <div key={m} data-mois={m} data-saison={enSaison} className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-semibold text-muted">{v}</span>
                <div className="bar-grow w-full max-w-[46px] rounded-t-[10px] rounded-b-[4px]" style={{ height: barHeight(v, max, 170), background: enSaison ? "#009E60" : "#C9D3CD", ["--i" as string]: i } as React.CSSProperties} />
              </div>
            );
          })}
        </div>
        <div className="relative grid grid-cols-12 gap-2.5 px-2 pt-2 text-center text-[13px] text-muted">
          {MOIS.map((m) => <span key={m}>{m}</span>)}
        </div>
      </div>
    </div>
  );
}
