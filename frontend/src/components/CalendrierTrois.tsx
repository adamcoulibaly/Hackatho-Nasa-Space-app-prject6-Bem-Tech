import type { Rotation } from "@/lib/contract";

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
// Colonne des années étroite sur téléphone : le calendrier tient dans l'écran, sans défilement.
const COLONNES = "grid-cols-[40px_repeat(12,minmax(0,1fr))] sm:grid-cols-[80px_repeat(12,minmax(0,1fr))]";
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
      <div className="min-w-0">
        <div className="flex flex-col gap-2">
          <div className={`grid items-center gap-0.5 text-center text-[11px] text-muted sm:gap-1 sm:text-[13px] ${COLONNES}`}>
            <span />
            {MOIS.map((m) => (
              <span key={m} title={m}>
                <span aria-hidden="true" className="sm:hidden">{m[0]}</span>
                <span className="sr-only sm:not-sr-only">{m}</span>
              </span>
            ))}
          </div>
          {[1, 2, 3].map((annee) => (
            <div key={annee} className={`grid h-11 gap-0.5 sm:gap-1 ${COLONNES}`}>
              <span className="self-center text-xs font-bold sm:text-sm">
                <span aria-hidden="true" className="sm:hidden">{`An ${annee}`}</span>
                <span className="sr-only sm:not-sr-only">{`Année ${annee}`}</span>
              </span>
              {calendrier
                .filter((c) => c.annee === annee)
                .map((c, i) => (
                  <div
                    key={i}
                    className="flex min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-lg px-1.5 text-xs font-bold sm:rounded-xl sm:px-3 sm:text-sm"
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
