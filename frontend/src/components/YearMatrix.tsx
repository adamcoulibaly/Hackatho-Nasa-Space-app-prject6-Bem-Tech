import type { Climat } from "@/lib/contract";

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const NIVEAUX = ["Très faible", "Faible", "Moyen", "Élevé", "Très élevé"];
const PALETTES: Record<Climat["matrice"][number]["palette"], string[]> = {
  eau: ["#EEF2EC", "#BFE3CF", "#5CC394", "#009E60", "#00703C"],
  chaud: ["#FFF1E2", "#FDD3A6", "#FBA95A", "#F77F00", "#A04F00"],
  veg: ["#EDE3D3", "#D2BE87", "#9DB45A", "#4E9A3C", "#0B5130"],
};

export function YearMatrix({ lignes }: { lignes: Climat["matrice"] }) {
  const cols = "210px repeat(12, minmax(0, 1fr))";
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[760px] flex-col gap-1.5">
        <div className="grid gap-1.5 text-center text-[13px] text-muted" style={{ gridTemplateColumns: cols }}>
          <span />
          {MOIS.map((m) => <span key={m}>{m}</span>)}
        </div>
        {lignes.map((l) => (
          <div key={l.label} className="grid gap-1.5" style={{ gridTemplateColumns: cols }}>
            <div className="flex flex-col justify-center">
              <span className="text-[15px] font-semibold">{l.label}</span>
              <span className="text-xs text-muted">{l.source}</span>
            </div>
            {l.valeurs.map((v, i) => (
              <div key={i} title={`${l.label}, ${MOIS[i]} : ${NIVEAUX[v]}`} className="h-[46px] rounded-[10px]" style={{ background: PALETTES[l.palette][v] }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
