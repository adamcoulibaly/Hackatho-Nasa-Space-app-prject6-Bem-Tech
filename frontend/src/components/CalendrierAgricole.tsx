"use client";

import { useMemo, useState } from "react";
import type { Culture, Saisons } from "@/lib/contract";
import { calendrierCulture, etapeDuJour, semisHabituel } from "@/lib/moteur/calendrier-agricole";

type Saison = { debut: number; fin: number };
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const date = (iso: string) => {
  const [, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]}`;
};
const PICTO: Record<string, string> = {
  preparation: "M4 20h16M7 20l3-8h4l3 8M12 12V4", semis: "M12 20v-8M8 16l4-4 4 4", levee: "M12 20v-6m0 0c0-3 3-4 5-4-1 3-3 4-5 4zm0 0c0-3-3-4-5-4 1 3 3 4 5 4z",
  entretien: "M5 20l6-6M14 4l6 6-8 8-6-6z", floraison: "M12 20v-8m0 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6z", maturation: "M12 20V8m-3 3 3-3 3 3",
  recolte: "M4 14h16l-2 6H6zM8 14V8m4 6V6m4 8V8", post_recolte: "M4 10h16v10H4zM2 10l10-6 10 6",
};

/** Calendrier agricole : étapes datées pour une culture, la saison choisie et la date de semis (habituelle ou réelle). */
/** `semisDuJour` : date où les pluies se sont installées cette année (état de semis de l'accueil), si elle existe. */
export function CalendrierAgricole({ cultures, mesCultures, saisons, saisonsRegion, aujourdhui, semisDuJour }: {
  cultures: Culture[]; mesCultures: string[]; saisons: Saisons | null; saisonsRegion: Saison[]; aujourdhui: string; semisDuJour?: string;
}) {
  const connues = mesCultures.filter((c) => cultures.some((x) => x.nom === c));
  const [culture, setCulture] = useState(connues[0] ?? cultures[0].nom);
  const [iSaison, setISaison] = useState(0);
  const annee = Number(aujourdhui.slice(0, 4));
  const saison = saisonsRegion[iSaison] ?? saisonsRegion[0];
  const habituel = semisHabituel(saisons, culture, annee, saison);
  const [semisReel, setSemisReel] = useState<string | null>(null);
  // La date où les pluies se sont installées cette année (accueil) prime sur l'habitude, si elle tombe dans la saison choisie.
  const moisDuJour = semisDuJour ? Number(semisDuJour.slice(5, 7)) : 0;
  const pluiesInstallees = semisDuJour && semisDuJour.startsWith(String(annee)) && moisDuJour >= saison.debut - 1 && moisDuJour <= saison.fin ? semisDuJour : null;
  const semis = semisReel ?? pluiesInstallees ?? habituel.date;
  const fiche = cultures.find((c) => c.nom === culture)!;
  const etapes = useMemo(() => calendrierCulture(fiche, semis), [fiche, semis]);
  const enCours = etapeDuJour(etapes, aujourdhui);
  const moisSaison = (saison.fin - saison.debut + 1) * 30;
  const tropLong = iSaison > 0 && fiche.cycleJours > moisSaison + 30;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-[26px]">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Culture">
          {(connues.length ? connues : [culture]).map((c) => (
            <button key={c} type="button" aria-pressed={c === culture} onClick={() => { setCulture(c); setSemisReel(null); }} className={`h-11 rounded-full px-4 text-sm font-bold ${c === culture ? "bg-ink text-paper" : "border border-line"}`}>{c}</button>
          ))}
        </div>
        {saisonsRegion.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Saison des pluies">
            {saisonsRegion.map((s, i) => (
              <button key={s.debut} type="button" aria-pressed={i === iSaison} onClick={() => { setISaison(i); setSemisReel(null); }} className={`h-11 rounded-full px-4 text-sm font-bold ${i === iSaison ? "bg-orange text-ink" : "border border-line"}`}>
                {`${i === 0 ? "Grande saison" : "Petite saison"} (${MOIS[s.debut - 1]} → ${MOIS[s.fin - 1]})`}
              </button>
            ))}
          </div>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Date de semis
          <input type="date" className="min-h-11 rounded-xl border border-line bg-paper px-3 text-[15px]" value={semis} onChange={(e) => e.target.value && setSemisReel(e.target.value)} />
        </label>
        <p className="m-0 text-sm text-muted">
          {semisReel
            ? "Date de semis que vous avez indiquée : tout le calendrier s'y adapte."
            : pluiesInstallees
              ? `Cette année, les pluies se sont installées le ${date(pluiesInstallees)} (NASA POWER, comme sur l'accueil) : le calendrier part de cette date. Changez-la si vous avez semé un autre jour.`
              : habituel.source === "mesure"
              ? `Date de semis habituel observé dans votre région (médiane 2005–2025, NASA POWER) : ${date(habituel.date)}. Changez-la si vous avez semé à une autre date.`
              : `Date estimée en début de saison (${date(habituel.date)}) : indiquez votre vraie date de semis.`}
        </p>
        {tropLong && <p className="m-0 rounded-2xl bg-[#FDE7CC] p-3 text-sm text-[#5C2E00]">{`Le cycle du ${culture.toLowerCase()} (${fiche.cycleJours} jours) dépasse la petite saison : préférez une culture courte (niébé, arachide).`}</p>}
      </section>

      <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label={`Calendrier du ${culture.toLowerCase()}`}>
        {etapes.map((e) => {
          const actif = enCours?.id === e.id;
          return (
            <li key={e.id} data-testid={actif ? "etape-en-cours" : "etape"} className={`flex gap-3 rounded-2xl p-4 ${actif ? "bg-ink text-paper" : "bg-white"}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-7 w-7 shrink-0" fill="none" stroke={actif ? "#F77F00" : "#00703C"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={PICTO[e.id]} /></svg>
              <div className="flex min-w-0 flex-col gap-1">
                <strong className="text-[15px]">{`${e.label}${actif ? " · en cours" : ""}`}</strong>
                <span className={`text-sm ${actif ? "text-[#C9D4CD]" : "text-muted"}`}>{e.debut === e.fin ? date(e.debut) : `du ${date(e.debut)} au ${date(e.fin)}`}</span>
                <span className="text-sm leading-normal">{e.conseil}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="m-0 text-xs leading-normal text-muted">Durées des stades : FAO-56, ramenées au cycle de la fiche culture ; conseils et durées à valider par l&apos;agronome. Les dates varient selon la variété et la pluie de l&apos;année : suivez les alertes de semis sur l&apos;accueil.</p>
    </div>
  );
}
