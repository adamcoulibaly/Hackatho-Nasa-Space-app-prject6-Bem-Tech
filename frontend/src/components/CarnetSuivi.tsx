"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Saisons } from "@/lib/contract";
import { ajouterObservation, bilanCarnet, comparerObservation, lireCarnet, supprimerObservation, type Observation, type ObservationEnregistree } from "@/lib/carnet";
import { useParcelle } from "@/lib/parcelle/context";

const ETATS: [Observation["etat"], string][] = [["bonne", "Bon"], ["moyenne", "Moyen"], ["mauvaise", "Mauvais"]];
const PLUIES: [Observation["pluie"], string][] = [["assez", "Assez de pluie"], ["trop", "Trop de pluie"], ["pas_assez", "Pas assez de pluie"]];
const RECOLTES: [NonNullable<Observation["recolte"]>, string][] = [["bonne", "Bonne"], ["moyenne", "Moyenne"], ["faible", "Faible"], ["nulle", "Nulle"]];
const MOT_RECOLTE = { bonne: "bonne", moyenne: "moyenne", faible: "faible", nulle: "nulle" } as const;
/** Pictogrammes pour une lecture sans texte : plante droite, penchée, fanée ; soleil, goutte, nuage chargé. */
const PICTOS: Record<string, string> = {
  bonne: "M12 21V9m0 4c-3 0-5-2-5-5 3 0 5 2 5 5zm0-2c3 0 5-2 5-5-3 0-5 2-5 5z", moyenne: "M12 21v-8l3-4m-3 6c-3 0-4-2-4-4 2 0 4 2 4 4z", mauvaise: "M12 21v-7l-4-4m4 6c2 0 4-1 5-3",
  assez: "M12 4s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z", trop: "M5 11a5 5 0 0 1 9-3 4 4 0 0 1 5 4H5zm2 4v3m5-3v3m5-3v3", pas_assez: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 2v2m0 16v2M2 12h2m16 0h2",
};
const Picto = ({ id }: { id: string }) => (
  <svg data-picto={id} aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={PICTOS[id]} /></svg>
);
const MOT_ETAT = { bonne: "bon", moyenne: "moyen", mauvaise: "mauvais" } as const;
const MOT_PLUIE = { assez: "assez de pluie", trop: "trop de pluie", pas_assez: "pas assez de pluie" } as const;
const FIELD = "min-h-11 rounded-xl border border-line bg-paper px-3 text-[15px]";
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const dateLisible = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Carnet de suivi : l'agriculteur note ce qu'il voit, ForoSat le compare à ce que les saisons réelles laissaient prévoir. */
export function CarnetSuivi({ saisons }: { saisons: Saisons | null }) {
  const { parcelle } = useParcelle();
  const cultures = [...parcelle.cultures, ...(parcelle.autreCulture?.trim() ? [parcelle.autreCulture.trim()] : [])];
  const [carnet, setCarnet] = useState<ObservationEnregistree[]>([]);
  const [o, setO] = useState<Observation>({ date: aujourdhui(), culture: cultures[0] ?? "", etat: "bonne", pluie: "assez", note: "", type: "suivi" });
  const [erreur, setErreur] = useState("");
  useEffect(() => setCarnet(lireCarnet()), []);
  useEffect(() => {
    if (!o.culture && cultures[0]) setO((x) => ({ ...x, culture: cultures[0] }));
  }, [cultures, o.culture]);

  const ajouter = (e: FormEvent) => {
    e.preventDefault();
    try {
      ajouterObservation(o.type === "recolte" ? { ...o, recolte: o.recolte ?? "moyenne" } : { ...o, recolte: undefined }, saisons);
      setCarnet(lireCarnet());
      setO((x) => ({ ...x, note: "" }));
      setErreur("");
    } catch {
      setErreur("Observation incomplète : choisissez une culture et une date.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={ajouter} className="flex flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-[26px]">
        <div className="grid gap-3 min-[480px]:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Date
            <input type="date" className={FIELD} value={o.date} max={aujourdhui()} onChange={(e) => setO({ ...o, date: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Culture
            <select className={FIELD} value={o.culture} onChange={(e) => setO({ ...o, culture: e.target.value })}>
              {cultures.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
          <legend className="mb-2 p-0 text-sm font-semibold">Je note</legend>
          <div className="flex flex-wrap gap-2">
            {([["suivi", "Suivi du champ"], ["recolte", "Récolte"]] as const).map(([v, l]) => (
              <label key={v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] ${o.type === v ? "border-ink bg-ink text-paper" : "border-line"}`}>
                <input type="radio" name="type" className="sr-only" checked={o.type === v} onChange={() => setO({ ...o, type: v })} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        {o.type === "recolte" && (
          <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
            <legend className="mb-2 p-0 text-sm font-semibold">Ma récolte, par rapport à une année normale</legend>
            <div className="flex flex-wrap gap-2">
              {RECOLTES.map(([v, l]) => (
                <label key={v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] ${o.recolte === v ? "border-ink bg-ink text-paper" : "border-line"}`}>
                  <input type="radio" name="recolte" className="sr-only" checked={o.recolte === v} onChange={() => setO({ ...o, recolte: v })} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
          <legend className="mb-2 p-0 text-sm font-semibold">État de la culture</legend>
          <div className="flex flex-wrap gap-2">
            {ETATS.map(([v, l]) => (
              <label key={v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] ${o.etat === v ? "border-ink bg-ink text-paper" : "border-line"}`}>
                <input type="radio" name="etat" className="sr-only" checked={o.etat === v} onChange={() => setO({ ...o, etat: v })} />
                <Picto id={v} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
          <legend className="mb-2 p-0 text-sm font-semibold">La pluie ces derniers temps</legend>
          <div className="flex flex-wrap gap-2">
            {PLUIES.map(([v, l]) => (
              <label key={v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] ${o.pluie === v ? "border-ink bg-ink text-paper" : "border-line"}`}>
                <input type="radio" name="pluie" className="sr-only" checked={o.pluie === v} onChange={() => setO({ ...o, pluie: v })} />
                <Picto id={v} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Ce que j&apos;observe (facultatif)
          <textarea className={`${FIELD} min-h-20 py-2`} maxLength={280} value={o.note} onChange={(e) => setO({ ...o, note: e.target.value })} placeholder="ex. feuilles jaunes, levée irrégulière, ravageurs" />
        </label>
        {erreur && <p role="alert" className="m-0 text-sm text-[#5C2E00]">{erreur}</p>}
        <button type="submit" className="h-[52px] self-start rounded-full bg-orange px-6 text-base font-bold text-ink">Ajouter au carnet</button>
        <p className="m-0 text-xs text-muted">Le carnet reste sur ce téléphone : il n&apos;est envoyé nulle part. <Link href="/parcelle">Modifier ma parcelle</Link> si quelque chose a changé (cultures, surface, matériel).</p>
      </form>

      {carnet.length === 0 ? (
        <p className="m-0 rounded-2xl bg-white p-5 text-[15px] text-muted">Aucune observation pour l&apos;instant. Notez ce que vous voyez dans votre champ au fil de la saison : ForoSat le comparera à ses prévisions.</p>
      ) : (
        <>
        {(() => {
          const b = bilanCarnet(carnet, saisons);
          return b.total > 0 ? (
            <p className="m-0 rounded-2xl bg-white p-4 text-[15px] font-semibold">{`Prévisions face à la réalité : sur ${b.total} observation${b.total > 1 ? "s" : ""}, ${b.concordent} concorde${b.concordent > 1 ? "nt" : ""} avec l'habitude de votre région.`}</p>
          ) : null;
        })()}
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {carnet.map((x) => {
            const c = comparerObservation(x, saisons);
            return (
              <li key={x.id} className="flex flex-col gap-1.5 rounded-2xl bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-[15px]">{`${dateLisible(x.date)} · ${x.culture}`}</strong>
                  <button type="button" onClick={() => { supprimerObservation(x.id); setCarnet(lireCarnet()); }} className="min-h-11 px-2 text-sm font-semibold text-muted" aria-label={`Supprimer l'observation du ${dateLisible(x.date)}`}>Supprimer</button>
                </div>
                <span className="text-[15px]">{`${x.type === "recolte" && x.recolte ? `Récolte ${MOT_RECOLTE[x.recolte]}. ` : ""}État ${MOT_ETAT[x.etat]}, ${MOT_PLUIE[x.pluie]}.${x.note ? ` ${x.note}` : ""}`}</span>
                <span className="text-sm text-muted">{c.attendu}</span>
                {c.ecart && <span className="text-sm font-semibold text-[#5C2E00]">Écart avec la prévision : votre saison s&apos;écarte de l&apos;habitude ; parlez-en à votre conseiller. Vos observations aident à vérifier et améliorer ForoSat.</span>}
              </li>
            );
          })}
        </ul>
        </>
      )}
    </div>
  );
}
