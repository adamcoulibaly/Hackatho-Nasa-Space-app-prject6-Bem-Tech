"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Culture, Saisons } from "@/lib/contract";
import type { RotationCalculee } from "@/lib/moteur/rotations";
import { anneesExtremes, etatAuJour, simuler, type Duree, type Scenario, type Simulation } from "@/lib/moteur/simulation";
import { lirePrix, rentabilite, type Prix } from "@/lib/rentabilite";
import { scoreWord } from "@/lib/format";
import { PlanteIllustration } from "./PlanteIllustration";
import { IconeCulture } from "./plantes";

const DUREES: Duree[] = [3, 5, 10];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const STADE = { sol_nu: "sol nu", levee: "levée", croissance: "croissance", floraison: "floraison", maturite: "maturité" } as const;
const COULEUR = { bonne: "#009E60", difficile: "#F77F00", perdue: "#C2410C" } as const;
const MOT = { bonne: "bonne", difficile: "difficile", perdue: "perdue" } as const;
const SOL = { "s'enrichit": "un sol qui s'enrichit", stable: "un sol stable", "s'appauvrit": "un sol qui s'appauvrit" } as const;
const PILULE = "h-11 rounded-full px-4 text-sm font-bold transition-colors duration-150";
const TUILE = "flex flex-col gap-0.5 rounded-2xl bg-paper p-3.5";
const GRAND = "font-display text-[22px] font-bold leading-tight tracking-[-0.02em]";
const PUCE = "rounded-full bg-paper px-3 py-1.5 text-[13px] text-ink";

/** Équilibre : rendement, fertilité et couverture du sol, à poids égaux (le revenu, hypothétique, n'y entre pas). */
const equilibre = (s: Simulation) =>
  s.rendementMoyen / 100 + (s.tendanceFertilite === "s'enrichit" ? 1 : s.tendanceFertilite === "stable" ? 0.5 : 0) + s.couvertureMoyenne / 100;

function moisDuJour(jour: number) {
  return MOIS[new Date(Date.UTC(2025, 0, jour)).getUTCMonth()];
}
const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

function Choix<T extends string | number>({ libelle, options, valeur, onChange }: { libelle: string; options: [T, string][]; valeur: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-muted">{libelle}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={libelle === "Durée de la simulation" ? "Durée" : "Scénario climatique"}>
        {options.map(([id, label]) => (
          <button key={String(id)} type="button" aria-pressed={id === valeur} onClick={() => onChange(id)} className={`${PILULE} ${id === valeur ? "bg-ink text-paper" : "border border-line bg-white hover:border-ink"}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Une saison simulée : colonne dont la hauteur est le rendement, la couleur le verdict, avec l'année et la culture. */
function Colonne({ a, reel }: { a: Simulation["annees"][number]; reel: boolean }) {
  return (
    <li className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${reel ? a.anneeSource : `Année ${a.annee}`} : ${a.culture}, saison ${MOT[a.verdict]}, rendement ${a.rendement} %`}>
      <span className="text-[11px] font-bold tabular-nums">{`${a.rendement}%`}</span>
      <span className="flex h-24 w-full max-w-[64px] items-end overflow-hidden rounded-xl bg-paper">
        <span className="bar-grow w-full rounded-xl" style={{ height: `${Math.max(6, a.rendement)}%`, background: COULEUR[a.verdict] }} />
      </span>
      <span className="text-[11px] font-semibold tabular-nums text-muted">{reel ? String(a.anneeSource) : `An ${a.annee}`}</span>
      <span className="flex max-w-full flex-col items-center gap-0.5 text-[11px] text-muted"><IconeCulture culture={a.culture} taille={22} /><span className="max-w-full truncate">{a.culture}</span></span>
    </li>
  );
}

/** Les rotations comparées sur plusieurs années, avec les mêmes saisons et notes que leurs fiches. */
export function Simulateur({ rotations, saisons, cultures, surface = 1 }: { rotations: RotationCalculee[]; saisons: Saisons; cultures: Culture[]; surface?: number }) {
  const [duree, setDuree] = useState<Duree>(5);
  const [scenario, setScenario] = useState<Scenario>("reel");
  const [prix, setPrix] = useState<Prix>({});
  useEffect(() => setPrix(lirePrix()), []);
  const extremes = anneesExtremes(saisons);
  const sims = useMemo(() => rotations.map((r) => ({ r, s: simuler(r.sequence, saisons, cultures, duree, scenario) })), [rotations, saisons, cultures, duree, scenario]);
  const meilleure = sims.reduce((a, b) => (equilibre(b.s) > equilibre(a.s) ? b : a));
  const conseillee = sims.find((x) => x.r.recommandee) ?? sims[0];
  const [choix, setChoix] = useState<string>(conseillee.r.id);
  const [jour, setJour] = useState(200);
  const visuelle = sims.find((x) => x.r.id === choix) ?? sims[0];
  const annee = Math.min(duree, Math.floor(jour / 365) + 1);
  const etat = etatAuJour(visuelle.s, cultures, annee, (jour % 365) + 1);
  const reel = scenario === "reel";
  const anneeVue = visuelle.s.annees.find((a) => a.annee === annee);
  const scenarios: [Scenario, string][] = [
    ["reel", "Saisons réelles récentes"],
    ["sec", `Année sèche (${extremes.seche})`],
    ["pluvieux", `Année pluvieuse (${extremes.pluvieuse})`],
  ];
  const libelleScenario = reel ? `les ${duree} dernières saisons réelles (${2025 - duree + 1}–2025)` : scenario === "sec" ? `l'année la plus sèche (${extremes.seche}) répétée ${duree} ans` : `l'année la plus pluvieuse (${extremes.pluvieuse}) répétée ${duree} ans`;
  const synthese =
    meilleure.r.id === conseillee.r.id
      ? `Sur ${libelleScenario}, la rotation ${conseillee.r.id}, conseillée par ForoSat, reste la meilleure : ${meilleure.s.rendementMoyen} % du potentiel de rendement, ${SOL[meilleure.s.tendanceFertilite]}, sol couvert ${meilleure.s.couvertureMoyenne} % de l'année.`
      : `Sur ${libelleScenario}, la rotation ${meilleure.r.id} fait mieux que la rotation ${conseillee.r.id} conseillée par ForoSat (${meilleure.s.rendementMoyen} % contre ${conseillee.s.rendementMoyen} % du potentiel). La rotation conseillée tient compte de vos priorités ; comparez-les avec l'assistant de la fiche.`;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-5 rounded-[28px] bg-white p-5 sm:p-[26px] md:grid-cols-[auto_1fr]">
        <Choix libelle="Durée de la simulation" options={DUREES.map((d) => [d, `${d} ans`])} valeur={duree} onChange={(d) => { setDuree(d); setJour(Math.min(jour, d * 365 - 1)); }} />
        <Choix libelle="Climat simulé" options={scenarios} valeur={scenario} onChange={setScenario} />
      </section>

      <div className="flex flex-col gap-1.5 rounded-[24px] bg-ink p-5 sm:p-6">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Verdict de la simulation</span>
        <p data-testid="synthese-simulation" className="m-0 text-[17px] leading-normal text-paper">{synthese}</p>
      </div>
      {sims[0].s.notes.map((a) => <p key={a} className="m-0 rounded-2xl bg-white p-3.5 text-sm">{a}</p>)}

      <section className="flex flex-col gap-4" aria-label="Rotations simulées">
        {sims.map(({ r, s }) => {
          const marge = rentabilite(r.sequence, prix, saisons, cultures, surface).margeMoyenneAn;
          const p = r.projection?.scenarios.ssp245;
          return (
            <article key={r.id} data-testid="ligne-simulation" className={`flex min-w-0 flex-col gap-4 rounded-[28px] p-5 sm:p-[26px] ${r.recommandee ? "bg-white ring-2 ring-ink" : "bg-white"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg font-bold text-paper">{r.id}</span>
                <strong className="min-w-0 flex-1 font-display text-lg leading-tight">{r.sequence.join(" → ")}</strong>
                <span className="flex flex-wrap gap-1.5">
                  {r.recommandee && <span className="rounded-full bg-orange px-3 py-1 text-[13px] font-bold text-ink">Conseillée par ForoSat</span>}
                  {r.id === meilleure.r.id && <span className="rounded-full bg-green px-3 py-1 text-[13px] font-bold text-ink">Meilleure sur ce scénario</span>}
                </span>
              </div>

              <ol className="m-0 flex list-none gap-1.5 p-0" aria-label="Saisons simulées">
                {s.annees.map((a) => <Colonne key={a.annee} a={a} reel={reel} />)}
              </ol>

              <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 md:grid-cols-4">
                <li className={TUILE}><strong className={GRAND}>{`${s.bonnes}/${s.annees.length}`}</strong><span className="text-[13px] text-muted">{`${s.bonnes} bonnes saisons sur ${s.annees.length}`}</span></li>
                <li className={TUILE}><strong className={GRAND}>{s.rendementMoyen}</strong><span className="text-[13px] text-muted">% du potentiel de rendement</span></li>
                <li className={TUILE}><strong className={`text-[18px] font-bold leading-tight sm:text-[20px] ${s.tendanceFertilite === "s'appauvrit" ? "text-[#A04F00]" : s.tendanceFertilite === "s'enrichit" ? "text-green-dark" : ""}`}>{`Sol ${s.tendanceFertilite}`}</strong><span className="text-[13px] text-muted">{`fertilité sur la fiche : ${scoreWord(r.scores.fertilite).toLowerCase()}`}</span></li>
                <li className={TUILE}><strong className={GRAND}>{s.couvertureMoyenne}</strong><span className="text-[13px] text-muted">% de l&apos;année sol couvert</span></li>
              </ul>

              {s.avertissements.map((a) => <p key={a} className="m-0 rounded-2xl bg-[#FDE7CC] p-3 text-sm text-[#5C2E00]">{a}</p>)}
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                {r.rejeu && r.rejeu.total > 0 && <span className={PUCE}>{`Fiche : ${r.rejeu.bonnes} bonnes sur ${r.rejeu.total} saisons réelles`}</span>}
                {p && r.projection && <span className={PUCE}>{`Vers 2050 : ${p.min === p.max ? p.min : `${p.min} à ${p.max}`} sur ${r.projection.total}`}</span>}
                {marge !== null ? (
                  <span className={`${PUCE} bg-[#D9F2E6] font-semibold text-green-dark`}>{`Marge avec vos prix : ${fcfa(marge)} par an sur ${surface.toLocaleString("fr-FR")} ha`}</span>
                ) : (
                  <span className={PUCE}>{`Revenu : ${s.revenu.note.toLocaleString("fr-FR")} sur 5 (hypothèse, prix locaux manquants) · `}<Link href="/rotations">Saisir vos prix</Link></span>
                )}
                <Link href={`/rotations/${r.id}`} className="ml-auto inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-bold text-paper no-underline hover:text-paper">{`Voir la fiche de la rotation ${r.id} →`}</Link>
              </div>
            </article>
          );
        })}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted" aria-hidden="true">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COULEUR.bonne }} />Bonne saison</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COULEUR.difficile }} />Difficile</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COULEUR.perdue }} />Perdue</span>
          <span>Hauteur de la colonne : rendement en % du potentiel (FAO-33).</span>
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-[26px]">
        <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">Voir la parcelle évoluer</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rotation à visualiser">
          {sims.map(({ r }) => (
            <button key={r.id} type="button" aria-pressed={r.id === choix} onClick={() => setChoix(r.id)} className={`${PILULE} ${r.id === choix ? "bg-ink text-paper" : "border border-line hover:border-ink"}`}>{`Rotation ${r.id}`}</button>
          ))}
        </div>
        <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <PlanteIllustration stade={etat.stade} etat={etat.etat} culture={etat.culture} />
          <div className="flex flex-col gap-2">
            <p data-testid="etat-du-jour" className="m-0 text-[15px] font-semibold" aria-live="polite">
              {`Année ${annee} · ${moisDuJour((jour % 365) + 1)} : ${etat.culture ? `${etat.culture} · ` : ""}${STADE[etat.stade]} · ${etat.etat}`}
            </p>
            {anneeVue && (
              <p className="m-0 text-sm text-muted">
                {`${reel ? `Saison réelle ${anneeVue.anneeSource}` : `Saison ${anneeVue.anneeSource} rejouée`} : ${anneeVue.semis ? `semis le ${Number(anneeVue.semis.slice(8, 10))} ${MOIS[Number(anneeVue.semis.slice(5, 7)) - 1]}` : "pas de semis possible"}, ${anneeVue.cause}.`}
              </p>
            )}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={duree * 365 - 1}
          value={jour}
          onChange={(e) => setJour(Number(e.target.value))}
          aria-label="Date de la simulation"
          aria-valuetext={`Année ${annee}, ${moisDuJour((jour % 365) + 1)}`}
          className="w-full accent-[#F77F00]"
        />
        <p className="m-0 text-xs leading-normal text-muted">
          Stades FAO-56 placés à la date de semis de la saison mesurée ; l&apos;état vient du bilan d&apos;eau de cette saison. Illustration, pas une photo : elle montre ce que les données prévoient.
        </p>
      </section>

      <p className="m-0 text-xs leading-normal text-muted">
        Mêmes données que les fiches : saisons réelles 2005–2025 (NASA POWER, journalier), bilan d&apos;eau FAO-56, rendement relatif FAO-33 ; en saisons réelles, chaque année porte la culture et le verdict du rejeu de la fiche. Fertilité : règles écrites (légumineuse +1, autre culture −0,5, même famille deux ans de suite −0,5), à valider par l&apos;agronome. <Link href="/rotations">Retour aux rotations</Link>
      </p>
    </div>
  );
}
