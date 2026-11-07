import type { Climat } from "@/lib/contract";
import { graceBar } from "@/lib/format";

const HACHURE = "repeating-linear-gradient(45deg, #E3E8E2 0 3px, #C9D3CD 3px 6px)";

export function GraceChart({ data }: { data: Climat["grace"] }) {
  const cols = { gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` };
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap gap-3.5 text-[13px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-green" />Plus que la normale</span>
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-orange" />Moins que la normale</span>
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded" style={{ background: HACHURE }} />Pas de mesure</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-[640px] flex-col gap-1.5">
          <div className="relative grid h-[140px] gap-1" style={cols}>
            <div aria-hidden="true" className="absolute inset-x-0 top-[70px] h-px bg-ink" />
            {data.map((g, i) => {
              const b = graceBar(g);
              return (
                <div key={g.annee} data-annee={g.annee} data-gap={b.gap} className="flex h-[140px] flex-col" title={b.gap ? `${g.annee} : pas de mesure` : `${g.annee} : écart ${g.ecart}`}>
                  {b.gap ? (
                    <div role="img" aria-label={`${g.annee} : Pas de mesure`} className="h-[140px] rounded" style={{ background: HACHURE }} />
                  ) : (
                    <>
                      <div className="flex h-[70px] items-end"><div className="bar-grow w-full rounded-t-[3px] bg-green" style={{ height: b.up, ["--i" as string]: i } as React.CSSProperties} /></div>
                      <div className="flex h-[70px] items-start"><div className="bar-grow-down w-full rounded-b-[3px] bg-orange" style={{ height: b.down, ["--i" as string]: i } as React.CSSProperties} /></div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid gap-1 text-xs text-muted" style={cols}>
            {data.map((g, i) => <span key={g.annee}>{i % 5 === 0 ? g.annee : ""}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
