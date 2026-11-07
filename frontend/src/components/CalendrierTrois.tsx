import type { Rotation } from "@/lib/contract";

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const HACHURE = "repeating-linear-gradient(45deg, #FDE7CC 0 6px, #F6C996 6px 12px)";

const style = (type: Rotation["calendrier"][number]["type"]) =>
  type === "culture" ? { background: "#07120D", color: "#F4F6F1" } : type === "couverture" ? { background: "#009E60", color: "#07120D" } : { background: HACHURE, color: "#5C2E00" };

export function CalendrierTrois({ calendrier }: { calendrier: Rotation["calendrier"] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-[13px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-ink" />Culture en place</span>
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-green" />Couverture conseillée</span>
        <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded" style={{ background: HACHURE }} />Sol nu</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-[720px] flex-col gap-2">
          <div className="grid items-center gap-1 text-center text-[13px] text-muted" style={{ gridTemplateColumns: "80px repeat(12, minmax(0, 1fr))" }}>
            <span />
            {MOIS.map((m) => <span key={m}>{m}</span>)}
          </div>
          {[1, 2, 3].map((annee) => (
            <div key={annee} className="grid h-11 gap-1" style={{ gridTemplateColumns: "80px repeat(12, minmax(0, 1fr))" }}>
              <span className="self-center text-sm font-bold">{`Année ${annee}`}</span>
              {calendrier
                .filter((c) => c.annee === annee)
                .map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center overflow-hidden whitespace-nowrap rounded-xl px-3 text-sm font-bold"
                    style={{ gridColumn: `${c.debutMois + 1} / ${c.finMois + 2}`, ...style(c.type) }}
                  >
                    {c.type === "sol_nu" ? <span className="sr-only">Sol nu</span> : c.culture}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
