"use client";

import { useEffect, useRef, useState } from "react";
import { ecouterNatif, envoyerAuNatif, estModeApp, ongletDe, type EtatAlerte } from "@/lib/modeApp";
import type { Rappel } from "@/lib/rappels";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dateLisible = (iso: string) => {
  const [, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]}`;
};

/** Dans l'app mobile : rappels de saison programmés sur le téléphone (préparation, semis, sarclages, carnet, prix, récolte). */
export function RappelsSaison({ rappels }: { rappels: Rappel[] }) {
  const [dansApp, setDansApp] = useState(false);
  const [etat, setEtat] = useState<EtatAlerte>("inactive");
  const [prochain, setProchain] = useState<string | undefined>();
  const liste = rappels.map((r) => ({ ...r, onglet: ongletDe(r.chemin) ?? "tableau" }));
  const cle = JSON.stringify(liste);
  const envoye = useRef("");

  useEffect(() => {
    const app = estModeApp() && !!(window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    setDansApp(app);
    if (!app) return;
    const arret = ecouterNatif((m) => {
      if (m.type !== "rappels") return;
      setEtat(m.etat);
      setProchain(m.prochain);
    });
    envoyerAuNatif({ type: "rappels", action: "etat" });
    return arret;
  }, []);

  // Rappels actifs : si le calendrier change (autre culture, pluies installées), le téléphone les reprogramme.
  useEffect(() => {
    if (etat !== "active" || envoye.current === cle) return;
    envoye.current = cle;
    envoyerAuNatif({ type: "rappels", action: "activer", liste: JSON.parse(cle) });
  }, [etat, cle]);

  if (!dansApp) return null;
  const active = etat === "active";
  const basculer = () => {
    if (active) return void envoyerAuNatif({ type: "rappels", action: "desactiver" });
    envoye.current = cle;
    envoyerAuNatif({ type: "rappels", action: "activer", liste });
  };
  return (
    <section className="flex flex-col gap-2 rounded-[22px] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <strong className="text-[15px]">Rappels de saison</strong>
          <span className="text-[13px] text-muted">Préparation du sol, semis, sarclages, floraison, carnet, prix et récolte : une notification le matin au bon moment, même sans internet.</span>
        </span>
        <button type="button" role="switch" aria-checked={active} aria-label="Rappels de saison" onClick={basculer}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-150 ${active ? "bg-green" : "bg-[#C9D3CD]"}`}>
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-[left] duration-150 ${active ? "left-7" : "left-1"}`} />
        </button>
      </div>
      {active && prochain && <p className="m-0 text-sm font-semibold text-green-dark">{`Prochain rappel : ${dateLisible(prochain)}, à 8 h.`}</p>}
      {active && !prochain && rappels.length === 0 && <p className="m-0 text-sm text-muted">Aucun rappel à venir pour cette saison.</p>}
      {etat === "refus" && <p className="m-0 text-sm text-orange-dark">Notifications refusées : activez-les dans les réglages du téléphone.</p>}
    </section>
  );
}
