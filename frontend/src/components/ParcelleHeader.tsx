"use client";

import { useParcelle } from "@/lib/parcelle/context";
import { SiteHeader, type Step } from "./SiteHeader";

export function ParcelleHeader({ current }: { current: Step }) {
  const { parcelle, saisie, pret } = useParcelle();
  const lieu = parcelle.region.split("(")[1]?.replace(")", "") ?? parcelle.region;
  const badge = pret && saisie && Number.isFinite(parcelle.surface) ? `${lieu} · ${parcelle.surface} ha` : undefined;
  return <SiteHeader current={current} badge={badge} bottomNav />;
}
