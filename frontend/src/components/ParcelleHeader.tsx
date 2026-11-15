"use client";

import { useParcelle } from "@/lib/parcelle/context";
import { SiteHeader, type Step } from "./SiteHeader";
import { nomCourt } from "@/lib/monde/nom";

export function ParcelleHeader({ current }: { current: Step }) {
  const { parcelle, saisie, pret } = useParcelle();
  const lieu = nomCourt(parcelle);
  const badge = pret && saisie && Number.isFinite(parcelle.surface) ? `${lieu} · ${parcelle.surface} ha` : undefined;
  return <SiteHeader current={current} badge={badge} bottomNav />;
}
