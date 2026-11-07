"use client";

import { useState, type FormEvent } from "react";
import { useParcelle } from "@/lib/parcelle/context";
import { CULTURES, PRIORITES, validateParcelle, type Eau, type Materiel, type Region } from "@/lib/parcelle/validate";

const FIELD = "h-12 rounded-[14px] border border-line bg-white px-3 text-[15px] text-ink";

/** Le formulaire n'est monté qu'une fois le stockage local lu : sinon le champ de surface garderait la valeur par défaut. */
export function ParcelleForm({ onSubmit }: { onSubmit: () => void }) {
  const { pret } = useParcelle();
  if (!pret) return <div aria-busy="true" className="min-h-[400px] max-w-[460px] rounded-[28px] bg-white" />;
  return <ParcelleFormChamps onSubmit={onSubmit} />;
}

function ParcelleFormChamps({ onSubmit }: { onSubmit: () => void }) {
  const { parcelle, setParcelle } = useParcelle();
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [surfaceTexte, setSurfaceTexte] = useState(String(parcelle.surface));

  const toggle = (liste: string[], valeur: string) =>
    liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = validateParcelle(parcelle);
    setErreurs(r.erreurs);
    if (r.ok) onSubmit();
  };

  return (
    <form onSubmit={submit} noValidate className="flex max-w-[460px] flex-col gap-[22px] rounded-[28px] bg-white p-[26px]">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="region" className="text-sm font-semibold">Région</label>
          <select id="region" className={FIELD} value={parcelle.region} onChange={(e) => setParcelle({ region: e.target.value as Region })}>
            <option>Poro (Korhogo)</option>
            <option>Gbêkê (Bouaké)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="surface" className="text-sm font-semibold">Surface (ha)</label>
          <input
            id="surface"
            type="number"
            inputMode="decimal"
            step="any"
            className={FIELD}
            value={surfaceTexte}
            onChange={(e) => {
              setSurfaceTexte(e.target.value);
              setParcelle({ surface: e.target.value === "" ? NaN : Number(e.target.value) });
            }}
          />
        </div>
      </div>

      <fieldset className="m-0 flex flex-col gap-2.5 border-none p-0">
        <legend className="mb-2.5 p-0 text-sm font-semibold">Ce que je cultive aujourd'hui</legend>
        <div className="flex flex-wrap gap-2">
          {CULTURES.map((c) => {
            const on = parcelle.cultures.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => setParcelle({ cultures: toggle(parcelle.cultures, c) })}
                className={`h-11 rounded-full border px-4 text-[15px] font-semibold ${on ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink"}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2.5 border-none p-0">
        <legend className="mb-2.5 p-0 text-sm font-semibold">Accès à l'eau</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {([
            ["pluie", "Pluie seulement", "Aucune irrigation"],
            ["irrigation", "Un peu d'irrigation", "Puits, bas-fond"],
          ] as [Eau, string, string][]).map(([v, titre, sous]) => (
            <label key={v} className={`flex min-h-[44px] cursor-pointer flex-col gap-1 rounded-2xl p-3.5 text-[15px] font-semibold ${parcelle.eau === v ? "border-2 border-ink" : "border border-line"}`}>
              <input type="radio" name="eau" checked={parcelle.eau === v} onChange={() => setParcelle({ eau: v })} className="mb-1.5 h-[18px] w-[18px] accent-ink" />
              {titre}
              <span className="text-[13px] font-normal text-muted">{sous}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2.5 border-none p-0">
        <legend className="mb-2.5 p-0 text-sm font-semibold">Ce qui compte le plus pour moi</legend>
        {PRIORITES.map((p) => (
          <label key={p} className="flex min-h-[44px] items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={parcelle.priorites.includes(p)}
              onChange={() => setParcelle({ priorites: toggle(parcelle.priorites, p) })}
              className="h-5 w-5 accent-green-dark"
            />
            {p}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="materiel" className="text-sm font-semibold">Mon matériel</label>
        <select id="materiel" className={FIELD} value={parcelle.materiel} onChange={(e) => setParcelle({ materiel: e.target.value as Materiel })}>
          <option value="daba">Travail à la main (daba)</option>
          <option value="traction">Traction animale (bœufs)</option>
          <option value="tracteur">Tracteur</option>
        </select>
      </div>

      {erreurs.length > 0 && (
        <div role="alert" className="rounded-2xl bg-[#FDE7CC] p-3.5 text-[15px] text-[#5C2E00]">
          {erreurs.map((e) => <p key={e} className="m-0">{e}</p>)}
        </div>
      )}

      <button type="submit" className="h-14 rounded-full bg-orange text-[17px] font-bold text-ink">Analyser ma parcelle</button>
    </form>
  );
}
