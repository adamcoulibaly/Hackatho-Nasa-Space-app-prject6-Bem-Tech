"use client";

import { useEffect, useState } from "react";
import { LANGUES, PHRASES, garderBrouillon, lireBrouillon, texteContribution, type Contribution } from "@/lib/traduction";

const FIELD = "min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-[15px]";

/** Formulaire de contribution : traduire les phrases clés dans sa langue et les envoyer à l'équipe pour relecture. */
export function Traduire({ ouvrir = (u) => window.open(u, "_blank", "noopener") }: { ouvrir?: (url: string) => void }) {
  const [c, setC] = useState<Contribution>({ langue: "", traductions: {} });
  useEffect(() => setC(lireBrouillon()), []);
  const maj = (n: Contribution) => {
    setC(n);
    garderBrouillon(n);
  };
  const pret = c.langue !== "" && PHRASES.some((p) => c.traductions[p.id]?.trim());
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 rounded-2xl bg-[#FDE7CC] p-4 text-[15px] leading-normal text-[#5C2E00]">
        ForoSat n&apos;invente aucune traduction : une traduction automatique en dioula ou en baoulé serait trop souvent fausse. Si vous parlez une de ces langues, traduisez les phrases ci-dessous ; l&apos;équipe les fera relire par d&apos;autres locuteurs avant de les ajouter.
      </p>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Ma langue
        <select value={c.langue} onChange={(e) => maj({ ...c, langue: e.target.value })} className={FIELD}>
          <option value="">Choisir</option>
          {LANGUES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </label>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {PHRASES.map((p) => (
          <li key={p.id}>
            <label className="flex flex-col gap-1 text-[15px] font-semibold">
              {p.fr}
              <input value={c.traductions[p.id] ?? ""} maxLength={200} onChange={(e) => maj({ ...c, traductions: { ...c.traductions, [p.id]: e.target.value } })} className={`${FIELD} font-normal`} />
            </label>
          </li>
        ))}
      </ol>
      <button type="button" disabled={!pret} onClick={() => ouvrir(`https://wa.me/?text=${encodeURIComponent(texteContribution(c.langue, c.traductions))}`)}
        className="h-12 self-start rounded-full bg-ink px-5 text-[15px] font-bold text-paper disabled:opacity-50">
        Envoyer à l&apos;équipe par WhatsApp
      </button>
      <p className="m-0 text-xs text-muted">Votre brouillon reste sur ce téléphone. Envoyez-le au groupe ou au membre de l&apos;équipe ForoSat qui vous a présenté l&apos;application.</p>
    </div>
  );
}
