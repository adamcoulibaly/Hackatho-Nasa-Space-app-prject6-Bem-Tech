import Link from "next/link";
import type { Climat, Rotation } from "@/lib/contract";
import { mesuresRecentes, saisonDuMoment } from "@/lib/saison";
import type { EtatSemis } from "@/lib/moteur/etat-semis";

export type Semis = { etat: EtatSemis; depuis?: string; message: string; dateDonnees: string };

const MOIS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const BADGE: Record<EtatSemis, string> = {
  seche: "Saison sèche",
  premieres_pluies: "Premières pluies",
  fenetre_ouverte: "Fenêtre de semis ouverte",
  poche_seche: "Poche sèche",
};
const TITRE: Partial<Record<EtatSemis, [string, string]>> = {
  premieres_pluies: ["Premières pluies :", "attendez"],
  fenetre_ouverte: ["C'est le moment de", "semer"],
  poche_seche: ["Poche sèche :", "attendez"],
};
const jourLisible = (iso: string) => {
  const [, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS_LONG[m - 1]}`;
};

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
  // Graduation de 0 à 4 entre le mois le plus bas et le plus haut de la région.
  const niv = (v: number) => Math.round(((v - min) / (max - min || 1)) * 4);
  const pal = veg ? NDVI : SOL;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-[#9DB0A5]">{veg ? "Végétation, mois par mois (NDVI MODIS)" : "Humidité du sol, mois par mois (normale)"}</span>
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

/** `semis` : état du jour (NASA POWER, /api/semis) ; sans lui, la saison est déduite des normales. */
export function Tableau({ climat, reco, semis }: { climat: Climat; reco: Rotation; semis?: Semis }) {
  const mois = new Date().getMonth() + 1;
  const s = saisonDuMoment(climat.saisons ?? [climat.saisonPluies], mois);
  const a = climat.actuel && mesuresRecentes(climat.actuel.dateFin) ? climat.actuel : undefined;
  return (
    <div data-stagger className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] leading-snug text-muted">{climat.meta?.source ?? "NASA POWER"}</span>
          <h1 className="m-0 font-display text-[22px] font-bold tracking-[-0.04em]">Votre champ</h1>
        </div>
        <Link href="/parcelle" aria-label="Changer de parcelle" className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full border border-line bg-white px-3.5 text-sm font-semibold text-ink no-underline hover:text-ink">Modifier</Link>
      </div>

      <section className="flex flex-col gap-3.5 rounded-[28px] bg-ink p-5 text-paper">
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full px-[11px] py-[5px] text-[13px] font-bold ${semis?.etat === "fenetre_ouverte" ? "bg-green text-ink" : "bg-[#3A2208] text-[#FFB066]"}`}>
            {semis ? BADGE[semis.etat] : s.saison}
          </span>
          <span className="text-[13px] text-[#9DB0A5]">{semis ? "En direct · NASA POWER" : "Climat NASA POWER"}</span>
        </div>
        <h2 className="m-0 font-display text-[30px] font-bold leading-[1.05] tracking-[-0.04em]">
          {semis && TITRE[semis.etat] ? TITRE[semis.etat]![0] : s.titre} <span className="text-orange">{semis && TITRE[semis.etat] ? TITRE[semis.etat]![1] : s.accent}</span>
        </h2>
        {semis && (
          <p className="m-0 text-[15px] font-semibold leading-[1.45]">
            {semis.message} <span className="font-normal text-[#9DB0A5]">{`(NASA POWER, pluie jusqu'au ${jourLisible(semis.dateDonnees)})`}</span>
          </p>
        )}
        <p className="m-0 text-[15px] leading-[1.45] text-[#C9D4CD]">
          {a ? a.texte : "Mesures récentes indisponibles (incomplètes ou trop anciennes) : seules les normales sont affichées."}
        </p>
        <Frise climat={climat} moisCourant={mois} />
      </section>

      {a && (
      <div data-stagger className="grid grid-cols-2 gap-2.5">
        {a.tuiles.map((t) => (
          <div key={t.label} data-testid="tuile" className="lift flex flex-col gap-2 rounded-[22px] bg-white p-3.5 [&:last-child:nth-child(odd)]:col-span-2">
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
            <div key={e.label} className="flex flex-col gap-0.5 rounded-2xl bg-white px-3.5 py-2.5 [&:last-child:nth-child(odd)]:col-span-2">
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
