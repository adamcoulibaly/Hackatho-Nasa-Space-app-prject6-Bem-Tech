"use client";

import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useRotations } from "@/lib/useRotations";
import { rotationConseillee } from "@/lib/moteur/rotations";
import { Tableau } from "./Tableau";
import { EtatCalcul } from "./EtatCalcul";
import { useSemis } from "@/lib/useSemis";
import { useEffect } from "react";
import { envoyerParcelle } from "@/lib/modeApp";
import { prochaineCulture } from "@/lib/whatsapp";
import { AlerteSemis } from "./AlerteSemis";

export function TableauVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle } = useParcelle();
  const etat = useRotations(initial, cultures, parcelle);
  const semis = useSemis(parcelle.region);
  const reco = etat.statut === "pret" ? rotationConseillee(etat.rotations) : null;
  const culture = reco ? prochaineCulture(reco).culture : null;
  // L'app garde la région et la culture à semer pour l'alerte de semis.
  useEffect(() => {
    envoyerParcelle(parcelle.region, culture);
  }, [parcelle.region, culture]);
  if (etat.statut !== "pret") return <EtatCalcul etat={etat} region={parcelle.region} />;
  return (
    <>
      <Tableau climat={etat.climat} reco={rotationConseillee(etat.rotations)} semis={semis} />
      <AlerteSemis />
    </>
  );
}
