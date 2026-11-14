"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ecouterNatif, envoyerAuNatif, estModeApp } from "@/lib/modeApp";
import { reduire } from "@/lib/photo/reduire";
import { exigerInternet, messageHorsLigne } from "@/lib/enLigne";

type Resultat = {
  analyse: { culture: string; couvertureSol: number; etat: "vigoureux" | "jaunissement" | "sec" | "sol_nu"; remarque: string };
  satellite: { ndvi: number; mois: string; normale: number | null } | null;
  comparaison: { verdict: "concordent" | "divergent" | "satellite_indisponible" | "position_inconnue"; raisons: string[] };
  conseil?: string;
};
type Etat = { statut: "repos" } | { statut: "analyse" } | { statut: "erreur"; message: string } | { statut: "pret"; r: Resultat };

const ETAT = { vigoureux: "plantes vigoureuses", jaunissement: "jaunissement", sec: "plantes sèches", sol_nu: "sol nu" } as const;
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const VERDICT = {
  concordent: "Les deux regards concordent.",
  divergent: "Les deux regards divergent. Raisons possibles :",
  satellite_indisponible: "Image satellite indisponible : seule la photo est analysée.",
  position_inconnue: "Position du champ inconnue : seule la photo est analysée.",
} as const;
const AIDE_POSITION = "Dessinez votre parcelle sur la carte pour que le satellite regarde votre champ.";
const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2).replace(".", ",")}° ${v >= 0 ? pos : neg}`;
const BTN = "inline-flex h-[52px] items-center justify-center rounded-full bg-ink px-6 text-base font-bold text-paper";

/** Photo du champ, confrontée à ce que voit le satellite au même endroit. */
/** `lat`/`lon` : position de la parcelle (contour ou GPS) ; sans elle, pas de comparaison satellite. */
export function PhotoChamp({ region, lat, lon, reduireImage = reduire }: { region: string; lat?: number; lon?: number; reduireImage?: (f: Blob) => Promise<string> }) {
  const position = lat !== undefined && lon !== undefined ? { lat, lon } : null;
  const [dansApp, setDansApp] = useState(false);
  const [etat, setEtat] = useState<Etat>({ statut: "repos" });

  const analyser = useCallback(
    async (image: string) => {
      if (!exigerInternet("l'analyse de la photo")) return setEtat({ statut: "erreur", message: messageHorsLigne("l'analyse de la photo") });
      setEtat({ statut: "analyse" });
      try {
        const r = await fetch("/api/photo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, ...(position ?? {}), region }) });
        const json = await r.json();
        setEtat(r.ok ? { statut: "pret", r: json as Resultat } : { statut: "erreur", message: json?.erreur ?? "Analyse impossible pour le moment." });
      } catch {
        setEtat({ statut: "erreur", message: "Pas de connexion : réessayez quand le réseau revient." });
      }
    },
    [lat, lon, region],
  );

  useEffect(() => {
    setDansApp(estModeApp() && !!(window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);
    return ecouterNatif((m) => {
      if (m.type !== "photo") return;
      if ("image" in m) void analyser(m.image);
      else if (m.erreur === "refus") setEtat({ statut: "erreur", message: "Appareil photo refusé : autorisez-le dans les réglages du téléphone." });
      else setEtat({ statut: "repos" });
    });
  }, [analyser]);

  return (
    <section aria-label="Votre champ vu du sol et de l'espace" className="flex min-w-0 flex-col gap-4">
      <p className="m-0 text-sm leading-normal text-muted">
        La photo est envoyée à un service d&apos;IA pour l&apos;analyse, puis oubliée : elle n&apos;est pas enregistrée. La position envoyée est arrondie à environ 1 km.
      </p>
      {!position && <p className="m-0 rounded-2xl bg-paper p-3 text-sm">{AIDE_POSITION}</p>}
      {dansApp ? (
        <button type="button" className={`${BTN} self-start`} onClick={() => envoyerAuNatif({ type: "photo" })} disabled={etat.statut === "analyse"}>
          Photographier mon champ
        </button>
      ) : (
        <label className={`${BTN} cursor-pointer self-start`}>
          Photographier mon champ
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={etat.statut === "analyse"}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                await analyser(await reduireImage(f));
              } catch {
                setEtat({ statut: "erreur", message: "Cette image ne peut pas être lue. Essayez une photo JPEG." });
              }
            }}
          />
        </label>
      )}
      <div aria-live="polite" className="flex flex-col gap-3">
        {etat.statut === "analyse" && <p className="m-0 text-[15px] text-muted">Analyse de la photo et lecture du satellite…</p>}
        {etat.statut === "erreur" && <p className="m-0 rounded-2xl bg-[#FDE7CC] p-3.5 text-[15px] text-[#5C2E00]">{etat.message}</p>}
        {etat.statut === "pret" && <Resultats r={etat.r} position={position} />}
      </div>
    </section>
  );
}

function Resultats({ r, position }: { r: Resultat; position: { lat: number; lon: number } | null }) {
  const a = r.analyse;
  const s = r.satellite;
  const mois = s ? `${MOIS[Number(s.mois.slice(5, 7)) - 1]} ${s.mois.slice(0, 4)}` : "";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-2xl bg-paper p-4">
          <span className="text-[13px] text-muted">Ce que voit votre téléphone</span>
          <strong className="font-display text-lg">{a.culture === "inconnue" ? "Culture non reconnue" : a.culture === "aucune" ? "Pas de culture" : a.culture}</strong>
          <span className="text-sm">{`Sol couvert à ${a.couvertureSol} % · ${ETAT[a.etat]}`}</span>
          <span className="text-sm text-muted">{a.remarque}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl bg-ink p-4 text-paper">
          <span className="text-[13px] text-[#9DB0A5]">Ce que voit la NASA</span>
          {s ? (
            <>
              <strong className="font-display text-lg">{`Végétation ${s.ndvi.toFixed(2).replace(".", ",")}`}</strong>
              <span className="text-sm">{s.normale != null ? `Normale de ${MOIS[Number(s.mois.slice(5, 7)) - 1]} : ${s.normale.toFixed(2).replace(".", ",")}` : "Normale indisponible"}</span>
              <span className="text-sm text-[#9DB0A5]">{`NDVI MODIS Terra, ${mois} (NASA GIBS, pixel d'environ 1 km)`}</span>
              {position && <span className="text-xs text-[#9DB0A5]">{`Point lu : ${coord(position.lat, "N", "S")} · ${coord(position.lon, "E", "O")}`}</span>}
            </>
          ) : (
            <span className="text-sm">{position ? "Image satellite indisponible pour ces derniers mois." : AIDE_POSITION}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-2xl border border-line p-4">
        <strong className="text-[15px]">{VERDICT[r.comparaison.verdict]}</strong>
        {r.comparaison.verdict === "divergent" && (
          <ul className="m-0 flex flex-col gap-1 pl-5 text-sm text-muted">
            {r.comparaison.raisons.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}
      </div>
      {r.conseil && (
        <p className="m-0 text-[15px] font-semibold">
          {r.conseil} <Link href="/rotations">Voir la rotation conseillée</Link>
        </p>
      )}
    </>
  );
}
