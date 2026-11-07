"use client";

import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useRotations } from "@/lib/useRotations";
import { Tableau } from "./Tableau";
import { EtatCalcul } from "./EtatCalcul";

export function TableauVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle } = useParcelle();
  const etat = useRotations(initial, cultures, parcelle);
  if (etat.statut !== "pret") return <EtatCalcul etat={etat} region={parcelle.region} />;
  const reco = etat.rotations.find((r) => r.recommandee) ?? etat.rotations[1];
  return <Tableau climat={etat.climat} reco={reco} />;
}
