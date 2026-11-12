"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Culture, Saisons } from "@/lib/contract";
import type { RotationCalculee } from "@/lib/moteur/rotations";
import { anneesExtremes, etatAuJour, simuler, type Duree, type Scenario, type Simulation } from "@/lib/moteur/simulation";
import { PlanteIllustration } from "./PlanteIllustration";

const DUREES: Duree[] = [3, 5, 10];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const STADE = { sol_nu: "sol nu", levee: "levée", croissance: "croissance", floraison: "floraison", maturite: "maturité" } as const;
const COULEUR = { bonne: "#009E60", difficile: "#F77F00", perdue: "#C2410C" } as const;
const BTN = "h-11 rounded-full px-4 text-sm font-bold";
const SOL = { "s'enrichit": "un sol qui s'enrichit", stable: "un sol stable", "s'appauvrit": "un sol qui s'appauvrit" } as const;

/** Équilibre : rendement, fertilité et couverture du sol, à poids égaux (le revenu, hypothétique, n'y entre pas). */
const equilibre = (s: Simulation) =>
  s.rendementMoyen / 100 + (s.tendanceFertilite === "s'enrichit" ? 1 : s.tendanceFertilite === "stable" ? 0.5 : 0) + s.couvertureMoyenne / 100;

function moisDuJour(jour: number) {
  const d = new Date(Date.UTC(2025, 0, jour));
  return MOIS[d.getUTCMonth()];
}

/** Les rotations comparées sur plusieurs années, sous trois scénarios, avec un simulateur visuel par date. */
export function Simulateur({ rotations, saisons, cultures }: { rotations: RotationCalculee[]; saisons: Saisons; cultures: Culture[] }) {
  const [duree, setDuree] = useState<Duree>(5);
  const [scenario, setScenario] = useState<Scenario>("reel");
  const extremes = anneesExtremes(saisons);
  const sims = useMemo(() => rotations.map((r) => ({ r, s: simuler(r.sequence, saisons, cultures, duree, scenario) })), [rotations, saisons, cultures, duree, scenario]);
  const meilleure = sims.reduce((a, b) => (equilibre(b.s) > equilibre(a.s) ? b : a));
  const [choix, setChoix] = useState<string>(rotations.find((r) => r.recommandee)?.id ?? rotations[0].id);
  const [jour, setJour] = useState(200);
  const visuelle = sims.find((x) => x.r.id === choix) ?? sims[0];
  const annee = Math.min(duree, Math.floor(jour / 365) + 1);
  const etat = etatAuJour(visuelle.s, cultures, annee, (jour % 365) + 1);
  const scenarios: [Scenario, string][] = [
    ["reel", "Saisons réelles récentes"],
    ["sec", `Année sèche (${extremes.seche})`],
    ["pluvieux", `Année pluvieuse (${extremes.pluvieuse})`],
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-[26px]">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-muted">Durée de la simulation</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Durée">
            {DUREES.map((d) => (
              <button key={d} type="button" aria-pressed={d === duree} onClick={() => { setDuree(d); setJour(Math.min(jour, d * 365 - 1)); }} className={`${BTN} ${d === duree ? "bg-ink text-paper" : "border border-line"}`}>{`${d} ans`}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-muted">Climat simulé</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Scénario climatique">
            {scenarios.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={id === scenario} onClick={() => setScenario(id)} className={`${BTN} ${id === scenario ? "bg-ink text-paper" : "border border-line"}`}>{label}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {sims.map(({ r, s }) => (
          <article key={r.id} data-testid="ligne-simulation" className="flex min-w-0 flex-col gap-3 rounded-[24px] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="font-display text-lg">{`${r.id} · ${r.sequence.join(" → ")}`}</strong>
              {r.id === meilleure.r.id && <span className="rounded-full bg-green px-3 py-1 text-[13px] font-bold text-ink">Meilleur équilibre</span>}
            </div>
            <div className="flex flex-wrap gap-1" aria-label="Saisons simulées">
              {s.annees.map((a) => (
                <span key={a.annee} title={`Année ${a.annee} : ${a.culture}, ${a.verdict}`} className="flex h-9 min-w-9 flex-col items-center justify-center rounded-lg px-1 text-[10px] font-bold text-white" style={{ background: COULEUR[a.verdict] }}>
                  <span>{a.annee}</span>
                  <span>{`${a.rendement}%`}</span>
                </span>
              ))}
            </div>
            <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-1 p-0 text-[15px] min-[480px]:grid-cols-2">
              <li><strong>{s.bonnes}</strong>{` bonnes saisons sur ${s.annees.length}`}</li>
              <li>{`Rendement : ${s.rendementMoyen} % du potentiel`}</li>
              <li>{`Sol ${s.tendanceFertilite}`}</li>
              <li>{`${s.couvertureMoyenne} % de l'année sol couvert`}</li>
              <li className="text-muted">{`Revenu : ${s.revenu.note.toLocaleString("fr-FR")} sur 5 (hypothèse, prix locaux manquants)`}</li>
            </ul>
            {s.avertissements.map((a) => <p key={a} className="m-0 rounded-2xl bg-[#FDE7CC] p-3 text-sm text-[#5C2E00]">{a}</p>)}
          </article>
        ))}
        <p className="m-0 text-[15px] leading-normal">
          {`Sur ${duree} ans, la rotation ${meilleure.r.id} offre le meilleur équilibre : ${meilleure.s.rendementMoyen} % du potentiel de rendement, ${SOL[meilleure.s.tendanceFertilite]}, ${meilleure.s.couvertureMoyenne} % de l'année couvert. Le classement peut changer avec la durée, le climat et vos priorités.`}
        </p>
        {sims[0].s.notes.map((a) => <p key={a} className="m-0 rounded-2xl bg-paper p-3 text-sm">{a}</p>)}
      </section>

      <section className="flex min-w-0 flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-[26px]">
        <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">Voir la parcelle évoluer</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rotation à visualiser">
          {sims.map(({ r }) => (
            <button key={r.id} type="button" aria-pressed={r.id === choix} onClick={() => setChoix(r.id)} className={`${BTN} ${r.id === choix ? "bg-ink text-paper" : "border border-line"}`}>{`Rotation ${r.id}`}</button>
          ))}
        </div>
        <PlanteIllustration stade={etat.stade} etat={etat.etat} />
        <p data-testid="etat-du-jour" className="m-0 text-[15px] font-semibold" aria-live="polite">
          {`Année ${annee} · ${moisDuJour((jour % 365) + 1)} : ${etat.culture ? `${etat.culture} · ` : ""}${STADE[etat.stade]} · ${etat.etat}`}
        </p>
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
        Source : saisons réelles 2005–2025 (NASA POWER, journalier), bilan d&apos;eau FAO-56, rendement relatif FAO-33. Fertilité : règles écrites (légumineuse +1, autre culture −0,5, même famille deux ans de suite −0,5), à valider par l&apos;agronome. <Link href="/rotations">Retour aux rotations</Link>
      </p>
    </div>
  );
}
