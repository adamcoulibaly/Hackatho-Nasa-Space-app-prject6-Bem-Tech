"use client";

import { useEffect, useState } from "react";
import type { Semis } from "@/components/Tableau";

/** État de semis du jour pour la région (/api/semis) ; undefined tant qu'il n'est pas chargé ou s'il est indisponible. */
export function useSemis(region: string): Semis | undefined {
  const [etat, setEtat] = useState<{ region: string; semis: Semis } | null>(null);
  useEffect(() => {
    let annule = false;
    fetch(`/api/semis/${region}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: Semis) => !annule && typeof json?.etat === "string" && setEtat({ region, semis: json }))
      .catch(() => undefined);
    return () => {
      annule = true;
    };
  }, [region]);
  return etat?.region === region ? etat.semis : undefined;
}
