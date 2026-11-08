"use client";

import { useEffect, useState } from "react";
import type { ZodType } from "zod";

/** Données d'une région servies par /api/<chemin>/<region> : undefined pendant le chargement, null si indisponibles. */
export function useDonneeRegion<T>(chemin: string, region: string, schema: ZodType<T>): T | null | undefined {
  const [etat, setEtat] = useState<{ region: string; donnee: T | null } | null>(null);
  useEffect(() => {
    let annule = false;
    fetch(`/api/${chemin}/${region}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => !annule && setEtat({ region, donnee: schema.parse(json) }))
      .catch(() => !annule && setEtat({ region, donnee: null }));
    return () => {
      annule = true;
    };
  }, [chemin, region, schema]);
  // Jamais les données d'une autre région que celle demandée.
  return etat && etat.region === region ? etat.donnee : undefined;
}
