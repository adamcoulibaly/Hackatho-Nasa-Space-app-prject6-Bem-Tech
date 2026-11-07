"use client";

import { useEffect, useState } from "react";
import { ClimatSchema, type Climat } from "@/lib/contract";
import { REGION_PILOTE } from "@/lib/regions";

export type EtatClimat = { statut: "pret"; climat: Climat } | { statut: "chargement" } | { statut: "erreur" };

/** Climat de la région : celui de la zone pilote est déjà chargé, les autres viennent de /api/climat/<id>. */
export function useClimatRegion(initial: Climat, region: string): EtatClimat {
  const pilote = initial.meta?.region ?? REGION_PILOTE;
  const [etat, setEtat] = useState<EtatClimat>({ statut: "pret", climat: initial });
  useEffect(() => {
    if (region === pilote) {
      setEtat({ statut: "pret", climat: initial });
      return;
    }
    let annule = false;
    setEtat({ statut: "chargement" });
    fetch(`/api/climat/${region}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => !annule && setEtat({ statut: "pret", climat: ClimatSchema.parse(json) }))
      .catch(() => !annule && setEtat({ statut: "erreur" }));
    return () => {
      annule = true;
    };
  }, [region, pilote, initial]);
  return etat;
}
