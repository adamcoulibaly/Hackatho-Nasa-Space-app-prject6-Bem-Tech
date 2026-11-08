"use client";

import { useEffect, useState } from "react";
import { SaisonsSchema, type Saisons } from "@/lib/contract";

/** Verdicts des saisons réelles de la région : undefined pendant le chargement, null si indisponibles. */
export function useSaisons(region: string): Saisons | null | undefined {
  const [etat, setEtat] = useState<{ region: string; saisons: Saisons | null } | null>(null);
  useEffect(() => {
    let annule = false;
    fetch(`/api/saisons/${region}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => !annule && setEtat({ region, saisons: SaisonsSchema.parse(json) }))
      .catch(() => !annule && setEtat({ region, saisons: null }));
    return () => {
      annule = true;
    };
  }, [region]);
  // Jamais les saisons d'une autre région que celle demandée.
  return etat && etat.region === region ? etat.saisons : undefined;
}
