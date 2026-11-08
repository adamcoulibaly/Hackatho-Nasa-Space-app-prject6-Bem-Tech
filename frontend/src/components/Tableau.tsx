import Link from "next/link";
import type { Climat, Rotation } from "@/lib/contract";

const NDVI = ["#3B1F0A", "#7A3D00", "#7FA33A", "#009E60", "#0B5130"];
const INITIALES = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const POINT = { alerte: "#F77F00", ok: "#009E60", neutre: "#07120D" } as const;

const SOL = ["#5C3A1E", "#8A6A3A", "#BFE3CF", "#5CC394", "#00703C"];

/** Frise de 12 mois : végétation (NDVI) si elle est branchée, sinon humidité du sol réelle. */
function Frise({ climat, moisCourant }: { climat: Climat; moisCourant: number }) {
  const veg = climat.onglets.find((o) => o.id === "veg");
  const sol = climat.onglets.find((o) => o.id === "sol");
  const serie = veg ?? sol;
  if (!serie) return null;
  const min = Math.min(...serie.valeurs);
  const max = Math.max(...serie.valeurs);
  const niv = (v: number) => (veg ? Math.round(v) : Math.round(((v - min) / (max - min || 1)) * 4));
  const pal = veg ? NDVI : SOL;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-[#9DB0A5]">{veg ? "Végétation, mois par mois" : "Humidité du sol, mois par mois (normale)"}</span>
      <div className="grid grid-cols-12 gap-[3px]" role="img" aria-label={`${serie.legende} : ${serie.valeurs.join(", ")}`}>
        {serie.valeurs.map((v, i) => (
          <div key={i} data-testid={veg ? "ndvi-mois" : "sol-mois"} className="flex flex-col items-center gap-1">
            <div className="bar-grow h-[26px] w-full rounded-[5px]" style={{ background: pal[niv(v)], outline: i + 1 === moisCourant ? "2px solid #F4F6F1" : "none", outlineOffset: 1, ["--i" as string]: i } as React.CSSProperties} />
            <span className="text-[10px] text-[#9DB0A5]">{INITIALES[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Tableau({ climat, reco }: { climat: Climat; reco: Rotation }) {
  const a = climat.actuel;
  return (
    <div data-stagger className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-muted">{climat.meta?.source ?? "NASA POWER"}</span>
          <h1 className="m-0 font-display text-[22px] font-bold tracking-[-0.04em]">Votre champ</h1>
        </div>
        <Link href="/parcelle" aria-label="Changer de parcelle" className="inline-flex h-11 items-center rounded-full border border-line bg-white px-3.5 text-sm font-semibold text-ink no-underline hover:text-ink">Modifier ma parcelle</Link>
      </div>

      <section className="flex flex-col gap-3.5 rounded-[28px] bg-ink p-5 text-paper">
        {a ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-[#3A2208] px-[11px] py-[5px] text-[13px] font-bold text-[#FFB066]">{a.saison}</span>
              <span className="text-[13px] text-[#9DB0A5]">Vu par satellite</span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="m-0 font-display text-[30px] font-bold leading-[1.05] tracking-[-0.04em]">
                {a.titre} <span className="text-orange">{a.accent}</span>
              </h2>
              <p className="m-0 text-[15px] leading-[1.45] text-[#C9D4CD]">{a.texte}</p>
            </div>
          </>
        ) : (
          <p className="m-0 text-[15px] text-[#C9D4CD]">État du moment indisponible : les dernières mesures NASA POWER sont incomplètes. Les normales ci-dessous restent valables.</p>
        )}
        <Frise climat={climat} moisCourant={a?.moisCourant ?? new Date().getMonth() + 1} />
      </section>

      {a && (
      <div data-stagger className="grid grid-cols-2 gap-2.5">
        {a.tuiles.map((t) => (
          <div key={t.label} data-testid="tuile" className="lift flex flex-col gap-2 rounded-[22px] bg-white p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted">{t.label}</span>
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: POINT[t.niveau] }} />
            </div>
            <span className="font-display text-lg font-bold tracking-[-0.03em]">{t.valeur}</span>
            <span className="text-xs text-muted">{t.source}</span>
          </div>
        ))}
      </div>
      )}

      {a && a.extras.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {a.extras.map((e) => (
            <div key={e.label} className="flex flex-col gap-0.5 rounded-2xl bg-white px-3.5 py-2.5">
              <span className="text-xs text-muted">{e.label}</span>
              <span className={`text-[15px] font-bold ${e.accent ? "text-orange-dark" : ""}`}>{e.valeur}</span>
            </div>
          ))}
        </div>
      )}

      <Link href="/rotations" className="flex items-center justify-between gap-3 rounded-3xl bg-orange p-[18px] text-ink no-underline hover:text-ink">
        <span className="flex flex-col gap-1">
          <span className="text-[13px] font-bold">Rotation conseillée</span>
          <span className="font-display text-[17px] font-bold tracking-[-0.03em]">{reco.sequence.join(" → ")}</span>
        </span>
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </Link>
    </div>
  );
}
