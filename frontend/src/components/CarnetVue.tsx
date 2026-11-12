"use client";

import { useParcelle } from "@/lib/parcelle/context";
import { useSaisons } from "@/lib/useSaisons";
import { CarnetSuivi } from "./CarnetSuivi";

export function CarnetVue() {
  const { parcelle, pret } = useParcelle();
  const saisons = useSaisons(parcelle.region);
  if (!pret) return null;
  return <CarnetSuivi saisons={saisons ?? null} />;
}
