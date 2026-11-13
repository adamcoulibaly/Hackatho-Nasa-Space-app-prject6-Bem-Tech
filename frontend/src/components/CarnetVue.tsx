"use client";

import { useParcelle } from "@/lib/parcelle/context";
import { useSaisons } from "@/lib/useSaisons";
import { regionParId, libelleRegion } from "@/lib/regions";
import { CarnetSuivi } from "./CarnetSuivi";
import { Signalement } from "./Signalement";

export function CarnetVue() {
  const { parcelle, pret } = useParcelle();
  const saisons = useSaisons(parcelle.region);
  if (!pret) return null;
  const region = regionParId(parcelle.region);
  return (
    <>
      <CarnetSuivi saisons={saisons ?? null} />
      <Signalement region={region ? libelleRegion(region) : parcelle.region} aujourdhui={new Date().toISOString().slice(0, 10)} />
    </>
  );
}
