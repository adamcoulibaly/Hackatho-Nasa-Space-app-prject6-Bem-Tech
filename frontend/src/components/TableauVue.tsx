"use client";

import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useRotations } from "@/lib/useRotations";
import { rotationConseillee } from "@/lib/moteur/rotations";
import { Tableau } from "./Tableau";
import { EtatCalcul } from "./EtatCalcul";

export function TableauVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle } = useParcelle();
  const etat = useRotations(initial, cultures, parcelle);
  if (etat.statut !== "pret") return <EtatCalcul etat={etat} region={parcelle.region} />;
  const reco = rotationConseillee(etat.rotations);
  return <Tableau climat={etat.climat} reco={reco} />;
}
