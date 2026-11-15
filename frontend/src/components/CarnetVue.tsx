"use client";

import { useParcelle } from "@/lib/parcelle/context";
import { useSaisons } from "@/lib/useSaisons";
import { libelleZone } from "@/lib/monde/nom";
import { CarnetSuivi } from "./CarnetSuivi";
import { Signalement } from "./Signalement";

export function CarnetVue() {
  const { parcelle, pret } = useParcelle();
  const saisons = useSaisons(parcelle.region);
  if (!pret) return null;
  return (
    <>
      <CarnetSuivi saisons={saisons ?? null} />
      <Signalement region={libelleZone(parcelle)} aujourdhui={new Date().toISOString().slice(0, 10)} />
    </>
  );
}
