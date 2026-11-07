"use client";

import { useParcelle } from "@/lib/parcelle/context";
import { SiteHeader, type Step } from "./SiteHeader";
import { regionParId } from "@/lib/regions";

export function ParcelleHeader({ current }: { current: Step }) {
  const { parcelle, saisie, pret } = useParcelle();
  const lieu = regionParId(parcelle.region)?.chefLieu ?? parcelle.region;
  const badge = pret && saisie && Number.isFinite(parcelle.surface) ? `${lieu} · ${parcelle.surface} ha` : undefined;
  return <SiteHeader current={current} badge={badge} bottomNav />;
}
