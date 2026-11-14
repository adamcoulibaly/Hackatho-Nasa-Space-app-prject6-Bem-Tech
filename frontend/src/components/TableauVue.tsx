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
      <Link href="/aujourdhui" className="flex items-center justify-between gap-3 rounded-3xl bg-ink p-[18px] text-paper no-underline hover:text-paper">
        <span className="flex flex-col gap-1">
          <strong className="text-[15px]">Ma parcelle aujourd&apos;hui</strong>
          <span className="text-sm text-[#C9D4CD]">Calendrier, vigilance, végétation NASA, carnet et rotation en un écran.</span>
        </span>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>
      <Link href="/calendrier" className="flex items-center justify-between gap-3 rounded-3xl bg-white p-[18px] text-ink no-underline hover:text-ink">
        <span className="flex flex-col gap-1">
          <strong className="text-[15px]">Mon calendrier agricole</strong>
          <span className="text-sm text-muted">Préparation, semis, entretien, récolte : les dates pour votre culture.</span>
        </span>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>
      <Link href="/guide" className="flex items-center justify-between gap-3 rounded-3xl border border-line p-[18px] text-ink no-underline hover:text-ink">
        <span className="flex flex-col gap-1">
          <strong className="text-[15px]">Guide d&apos;utilisation</strong>
          <span className="text-sm text-muted">Découvrir ForoSat en huit étapes.</span>
        </span>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>
      <Link href="/suivi" className="flex items-center justify-between gap-3 rounded-3xl bg-white p-[18px] text-ink no-underline hover:text-ink">
        <span className="flex flex-col gap-1">
          <strong className="text-[15px]">Mon carnet de suivi</strong>
          <span className="text-sm text-muted">Notez ce que vous voyez dans votre champ, comparé aux prévisions.</span>
        </span>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>
    </>
  );
}
