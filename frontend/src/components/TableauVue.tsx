"use client";

import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useRotations } from "@/lib/useRotations";
import { rotationConseillee } from "@/lib/moteur/rotations";
import { Tableau } from "./Tableau";
import { EtatCalcul } from "./EtatCalcul";
import { useSemis } from "@/lib/useSemis";

export function TableauVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle } = useParcelle();
  const etat = useRotations(initial, cultures, parcelle);
  const semis = useSemis(parcelle.region);
  if (etat.statut !== "pret") return <EtatCalcul etat={etat} region={parcelle.region} />;
  const reco = rotationConseillee(etat.rotations);
  return <Tableau climat={etat.climat} reco={reco} semis={semis} />;
}
