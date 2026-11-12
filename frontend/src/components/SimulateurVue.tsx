"use client";

import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useRotations } from "@/lib/useRotations";
import { useSaisons } from "@/lib/useSaisons";
import { EtatCalcul } from "./EtatCalcul";
import { Simulateur } from "./Simulateur";

export function SimulateurVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle } = useParcelle();
  const etat = useRotations(initial, cultures, parcelle);
  const saisons = useSaisons(parcelle.region);
  if (etat.statut !== "pret") return <EtatCalcul etat={etat} region={parcelle.region} />;
  if (saisons === undefined) return <EtatCalcul etat={{ statut: "chargement" }} region={parcelle.region} />;
  if (saisons === null) return <p className="m-0 rounded-2xl bg-white p-5">Les saisons réelles de cette région sont indisponibles pour le moment : le simulateur ne peut pas tourner.</p>;
  return <Simulateur rotations={etat.rotations} saisons={saisons} cultures={cultures} />;
}
