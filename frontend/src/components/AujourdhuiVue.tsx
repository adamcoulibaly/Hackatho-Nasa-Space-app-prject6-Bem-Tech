"use client";

import { useEffect, useState } from "react";
import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useRotations } from "@/lib/useRotations";
import { rotationConseillee } from "@/lib/moteur/rotations";
import { useSemis } from "@/lib/useSemis";
import { useAnomalie } from "@/lib/useAnomalie";
import { useSaisons } from "@/lib/useSaisons";
import { lireCarnet, type Observation } from "@/lib/carnet";
import { libelleZone } from "@/lib/monde/nom";
import { EtatCalcul } from "./EtatCalcul";
import { MaParcelleAujourdhui } from "./MaParcelleAujourdhui";

export function AujourdhuiVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle } = useParcelle();
  const etat = useRotations(initial, cultures, parcelle);
  const semis = useSemis(parcelle.region);
  const anomalie = useAnomalie(parcelle.centre);
  const saisons = useSaisons(parcelle.region);
  const [derniere, setDerniere] = useState<Observation | null>(null);
  useEffect(() => setDerniere(lireCarnet()[0] ?? null), []);
  if (etat.statut !== "pret") return <EtatCalcul etat={etat} region={parcelle.region} />;
  return (
    <MaParcelleAujourdhui
      region={libelleZone(parcelle)}
      reco={rotationConseillee(etat.rotations)}
      cultures={cultures}
      saisons={saisons ?? null}
      saisonRegion={etat.climat.saisonPluies}
      semis={semis}
      anomalie={anomalie}
      derniere={derniere}
      aujourdhui={new Date().toISOString().slice(0, 10)}
    />
  );
}
