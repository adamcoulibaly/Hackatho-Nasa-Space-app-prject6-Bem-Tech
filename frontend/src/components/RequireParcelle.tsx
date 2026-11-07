"use client";

import type { ReactNode } from "react";
import { useParcelle } from "@/lib/parcelle/context";
import { NeedParcelle } from "./NeedParcelle";

/** N'affiche son contenu que si la parcelle a été saisie à l'étape 1. */
export function RequireParcelle({ children }: { children: ReactNode }) {
  const { saisie, pret } = useParcelle();
  if (!pret) return <div aria-busy="true" className="min-h-[200px]" />;
  if (!saisie) return <NeedParcelle />;
  return <>{children}</>;
}
