"use client";

import { useMemo } from "react";
import type { Climat, Culture } from "@/lib/contract";
import { calculerRotations, type RotationCalculee } from "@/lib/moteur/rotations";
import type { Parcelle } from "@/lib/parcelle/validate";
import { useClimatRegion } from "@/lib/useClimatRegion";

export type EtatRotations =
  | { statut: "chargement" }
  | { statut: "erreur" }
  | { statut: "vide" }
  | { statut: "pret"; rotations: RotationCalculee[]; climat: Climat };

/** Rotations calculées pour une parcelle, avec le climat de sa région. */
export function useRotations(initial: Climat, cultures: Culture[], parcelle: Parcelle): EtatRotations {
  const climat = useClimatRegion(initial, parcelle.region);
  return useMemo(() => {
    if (climat.statut !== "pret") return climat;
    const rotations = calculerRotations(parcelle, climat.climat, cultures);
    return rotations ? { statut: "pret", rotations, climat: climat.climat } : { statut: "vide" };
  }, [climat, cultures, parcelle]);
}
