"use client";

import { useEffect, useState } from "react";
import { TYPES, ajouterSignalement, dateLongue, lienWhatsapp, lireSignalements, type Signal, type TypeSignalement } from "@/lib/signalement";

/** Prévenir les voisins d'un ravageur, d'une maladie ou d'un aléa, par WhatsApp, sans compte ni donnée personnelle. */
export function Signalement({ region, aujourdhui, ouvrir = (u) => window.open(u, "_blank", "noopener") }: {
  region: string; aujourdhui: string; ouvrir?: (url: string) => void;
}) {
  const [type, setType] = useState<TypeSignalement | null>(null);
  const [note, setNote] = useState("");
  const [historique, setHistorique] = useState<Signal[]>([]);
  useEffect(() => setHistorique(lireSignalements()), []);
  const envoyer = () => {
    if (!type) return;
    const s = { type, note: note.trim(), region, date: aujourdhui };
    setHistorique(ajouterSignalement(s));
    ouvrir(lienWhatsapp(s));
    setNote("");
    setType(null);
  };
  return (
    <section className="flex flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-[26px]">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">Prévenir mes voisins</h2>
        <p className="m-0 text-[15px] text-muted">Vous voyez un ravageur, une maladie ou un aléa ? Prévenez votre groupe WhatsApp du village ou de la coopérative. Seuls la région, la date et ce que vous écrivez sont partagés.</p>
      </div>
      <div role="radiogroup" aria-label="Type de signalement" className="flex flex-wrap gap-2">
        {(Object.keys(TYPES) as TypeSignalement[]).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)}
            className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold aria-checked:border-ink aria-checked:bg-ink aria-checked:text-paper">
            {TYPES[t].libelle}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Ce que vous voyez (facultatif)
        <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className="min-h-11 rounded-xl border border-line bg-paper px-3 text-[15px] font-normal" />
      </label>
      <button type="button" disabled={!type} onClick={envoyer} className="h-12 self-start rounded-full bg-[#1F7A4D] px-5 text-[15px] font-bold text-white disabled:opacity-50">
        Prévenir sur WhatsApp
      </button>
      {historique.length > 0 && (
        <ul aria-label="Mes signalements" className="m-0 flex list-none flex-col gap-1.5 p-0">
          {historique.slice(0, 10).map((s, i) => (
            <li key={`${s.date}-${i}`} className="rounded-2xl bg-paper px-3.5 py-2.5 text-sm">
              <strong>{TYPES[s.type].libelle}</strong>{` · ${dateLongue(s.date)}${s.note ? ` · ${s.note}` : ""}`}
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 text-xs text-muted">Un signalement est l&apos;observation d&apos;un agriculteur, pas un diagnostic. Avant tout traitement, demandez l&apos;avis d&apos;un conseiller agricole.</p>
    </section>
  );
}
