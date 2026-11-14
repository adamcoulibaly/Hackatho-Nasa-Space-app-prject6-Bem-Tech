"use client";

import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useRotations } from "@/lib/useRotations";
import { rotationConseillee } from "@/lib/moteur/rotations";
import { Tableau } from "./Tableau";
import { EtatCalcul } from "./EtatCalcul";
import { useSemis } from "@/lib/useSemis";
import { useAnomalie } from "@/lib/useAnomalie";
import { useSaisons } from "@/lib/useSaisons";
import { useDonneeRegion } from "@/lib/useDonneeRegion";
import { ProjectionsSchema } from "@/lib/contract";
import { risqueRegion } from "@/lib/moteur/risques";
import { useEffect } from "react";
import { envoyerParcelle } from "@/lib/modeApp";
import { prochaineCulture } from "@/lib/whatsapp";
import { AlerteSemis } from "./AlerteSemis";
import { RappelsSaison } from "./RappelsSaison";
import { planifierRappels, semisAPlanifier } from "@/lib/rappels";
import Link from "next/link";

const RACCOURCIS: [string, string, string, boolean][] = [
  ["Ma parcelle aujourd'hui", "/aujourdhui", "Tout en un écran", true],
  ["Mon calendrier agricole", "/calendrier", "Les dates de ma culture", false],
  ["Mon carnet de suivi", "/suivi", "Ce que je vois au champ", false],
  ["Guide d'utilisation", "/guide", "ForoSat en 8 étapes", false],
];

export function TableauVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle } = useParcelle();
  const etat = useRotations(initial, cultures, parcelle);
  const semis = useSemis(parcelle.region);
  const anomalie = useAnomalie(parcelle.centre);
  // Même calcul que la carte des risques : le chiffre de l'accueil et celui de la carte sont toujours identiques.
  const saisons = useSaisons(parcelle.region);
  const projections = useDonneeRegion("projections", parcelle.region, ProjectionsSchema);
  const risqueClimat = saisons ? risqueRegion(saisons, projections ?? null) : null;
  const reco = etat.statut === "pret" ? rotationConseillee(etat.rotations) : null;
  const culture = reco ? prochaineCulture(reco).culture : null;
  // L'app garde la région et la culture à semer pour l'alerte de semis.
  useEffect(() => {
    envoyerParcelle(parcelle.region, culture);
  }, [parcelle.region, culture]);
  if (etat.statut !== "pret") return <EtatCalcul etat={etat} region={parcelle.region} />;
  // Rappels de saison : même date de semis que le calendrier (pluies installées cette année, sinon l'habitude).
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const fiche = cultures.find((c) => c.nom === culture);
  const rappels = fiche
    ? planifierRappels(fiche, semisAPlanifier(fiche, saisons ?? null, etat.climat.saisonPluies, aujourdhui, semis?.etat === "fenetre_ouverte" ? semis.depuis : undefined), aujourdhui)
    : [];
  return (
    <>
      <Tableau climat={etat.climat} reco={rotationConseillee(etat.rotations)} semis={semis} anomalie={anomalie} risqueClimat={risqueClimat} />
      <AlerteSemis />
      <RappelsSaison rappels={rappels} />
      {/* Raccourcis compacts plutôt qu'une longue pile de cartes. */}
      <nav aria-label="Raccourcis" className="grid grid-cols-2 gap-2.5">
        {RACCOURCIS.map(([titre, href, sous, sombre]) => (
          <Link key={href} href={href} className={`flex min-h-[92px] flex-col justify-between gap-1 rounded-3xl p-4 no-underline ${sombre ? "bg-ink text-paper hover:text-paper" : "bg-white text-ink hover:text-ink"}`}>
            <strong className="text-[15px] leading-tight">{titre}</strong>
            <span className={`text-[13px] leading-snug ${sombre ? "text-[#C9D4CD]" : "text-muted"}`}>{sous}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
