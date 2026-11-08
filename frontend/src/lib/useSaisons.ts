"use client";

import { SaisonsSchema, type Saisons } from "@/lib/contract";
import { useDonneeRegion } from "@/lib/useDonneeRegion";

/** Verdicts des saisons réelles de la région : undefined pendant le chargement, null si indisponibles. */
export const useSaisons = (region: string): Saisons | null | undefined => useDonneeRegion("saisons", region, SaisonsSchema);
