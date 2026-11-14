"use client";

import { useEffect, useState } from "react";
import type { Culture, Saisons } from "@/lib/contract";
import { enregistrerPrix, lirePrix, rentabilite, type Prix } from "@/lib/rentabilite";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dateLisible = (iso: string) => {
  const [a, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
};
const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
const FIELD = "min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px]";

function FormPrix({ culture, initial, onEnregistre }: { culture: string; initial?: Prix[string]; onEnregistre: (v: { prixKg: number; recolteKgHa: number; chargesHa: number }) => void }) {
  const [v, setV] = useState({ prixKg: initial?.prixKg?.toString() ?? "", recolteKgHa: initial?.recolteKgHa?.toString() ?? "", chargesHa: initial?.chargesHa?.toString() ?? "" });
  const ok = [v.prixKg, v.recolteKgHa, v.chargesHa].every((x) => x !== "" && Number(x) >= 0);
  return (
    <fieldset aria-label={culture} className="m-0 flex flex-col gap-2 rounded-2xl border border-line p-3">
      <legend className="px-1 text-sm font-bold">{culture}</legend>
      <div className="grid gap-2 min-[480px]:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-semibold">Prix au marché (FCFA/kg)<input inputMode="numeric" className={FIELD} value={v.prixKg} onChange={(e) => setV({ ...v, prixKg: e.target.value })} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold">Récolte habituelle (kg/ha)<input inputMode="numeric" className={FIELD} value={v.recolteKgHa} onChange={(e) => setV({ ...v, recolteKgHa: e.target.value })} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold">Dépenses (FCFA/ha)<input inputMode="numeric" className={FIELD} value={v.chargesHa} onChange={(e) => setV({ ...v, chargesHa: e.target.value })} /></label>
      </div>
      <button type="button" disabled={!ok} onClick={() => onEnregistre({ prixKg: Number(v.prixKg), recolteKgHa: Number(v.recolteKgHa), chargesHa: Number(v.chargesHa) })} className="h-11 self-start rounded-full bg-ink px-4 text-sm font-bold text-paper disabled:opacity-50">Enregistrer</button>
    </fieldset>
  );
}

/** Recettes et marges de chaque rotation avec les prix saisis par l'agriculteur (datés), sur sa surface. */
export function Rentabilite({ rotations, saisons, cultures, surface, aujourdhui }: {
  rotations: { id: string; sequence: string[] }[]; saisons: Saisons | null; cultures: Culture[]; surface: number; aujourdhui: string;
}) {
  const [prix, setPrix] = useState<Prix>({});
  useEffect(() => setPrix(lirePrix()), []);
  const toutes = [...new Set(rotations.flatMap((r) => r.sequence))];
  const aucun = toutes.every((c) => !prix[c]);
  return (
    <section aria-label="Rentabilité avec vos prix" className="flex flex-col gap-4">
      {aucun && <p className="m-0 text-[15px] text-muted">Saisissez vos prix du marché, votre récolte habituelle et vos dépenses : ForoSat n&apos;a pas encore de prix locaux fiables et n&apos;en invente pas.</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rotations.map((r) => {
          const x = rentabilite(r.sequence, prix, saisons, cultures, surface);
          const date = x.parCulture.map((p) => p.date).sort()[0];
          return (
            <li key={r.id} data-testid={`rentabilite-${r.id}`} className="flex flex-col gap-1 rounded-2xl bg-paper p-3.5">
              <strong className="text-[15px]">{`${r.id} · ${r.sequence.join(" → ")}`}</strong>
              {x.margeMoyenneAn !== null ? (
                <span className="text-[15px]">{`Marge estimée : ${fcfa(x.margeMoyenneAn)} par an sur ${surface.toLocaleString("fr-FR")} ha (prix du ${dateLisible(date)})`}</span>
              ) : (
                <span className="text-sm text-muted">{`Prix manquant : ${x.manquants.join(", ")}`}</span>
              )}
              {x.parCulture.length > 0 && (
                <span className="text-xs text-muted">{x.parCulture.map((p) => `${p.culture} : ${fcfa(p.recette)} de recette (rendement ${p.rendement} % du potentiel), ${fcfa(p.depenses)} de dépenses`).join(" · ")}</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2">
        {toutes.map((c) => (
          <FormPrix key={`${c}-${prix[c]?.date ?? ""}`} culture={c} initial={prix[c]} onEnregistre={(v) => setPrix(enregistrerPrix(c, v, aujourdhui))} />
        ))}
      </div>
      <p className="m-0 text-xs leading-normal text-muted">Vos prix restent sur ce téléphone. Recette = surface × récolte habituelle × rendement relatif moyen des saisons réelles de votre région (FAO-33) × prix. Mettez vos prix à jour à chaque marché.</p>
    </section>
  );
}
