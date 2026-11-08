"use client";

import { useMemo } from "react";
import type { Climat, Culture } from "@/lib/contract";
import { calculerRotations, type RotationCalculee } from "@/lib/moteur/rotations";
import type { Parcelle } from "@/lib/parcelle/validate";
import { useClimatRegion } from "@/lib/useClimatRegion";
import { useSaisons } from "@/lib/useSaisons";

export type EtatRotations =
  | { statut: "chargement" }
  | { statut: "erreur"; reessayer: () => void }
  | { statut: "vide" }
  | { statut: "pret"; rotations: RotationCalculee[]; climat: Climat };

/** Rotations calculées pour une parcelle, avec le climat de sa région. */
export function useRotations(initial: Climat, cultures: Culture[], parcelle: Parcelle): EtatRotations {
  const climat = useClimatRegion(initial, parcelle.region);
  const saisons = useSaisons(parcelle.region);
  return useMemo(() => {
    if (climat.statut !== "pret") return climat;
    // On attend les saisons (rejeu) ; si elles manquent, les rotations sont calculées sans, et la lacune le dit.
    if (saisons === undefined) return { statut: "chargement" };
    const rotations = calculerRotations(parcelle, climat.climat, cultures, saisons);
    return rotations ? { statut: "pret", rotations, climat: climat.climat } : { statut: "vide" };
  }, [climat, saisons, cultures, parcelle]);
}
