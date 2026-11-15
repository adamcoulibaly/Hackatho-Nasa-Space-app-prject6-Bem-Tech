"use client";

import { useCallback, useEffect, useState } from "react";
import { ClimatSchema, type Climat } from "@/lib/contract";
import { REGION_PILOTE } from "@/lib/regions";
import { urlDonnee } from "@/lib/monde/url";

export type EtatClimat = { statut: "pret"; climat: Climat } | { statut: "chargement" } | { statut: "erreur"; reessayer: () => void };

type Interne = { statut: "pret"; climat: Climat } | { statut: "chargement" } | { statut: "erreur" };

/** Climat de la région : celui de la zone pilote est déjà chargé, les autres viennent de /api/climat/<id>. */
export function useClimatRegion(initial: Climat, region: string): EtatClimat {
  const pilote = initial.meta?.region ?? REGION_PILOTE;
  const [interne, setInterne] = useState<Interne>(region === pilote ? { statut: "pret", climat: initial } : { statut: "chargement" });
  const [essai, setEssai] = useState(0);
  const reessayer = useCallback(() => setEssai((n) => n + 1), []);

  useEffect(() => {
    if (region === pilote) {
      setInterne({ statut: "pret", climat: initial });
      return;
    }
    let annule = false;
    setInterne({ statut: "chargement" });
    fetch(urlDonnee("climat", region) ?? `/api/climat/${region}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => !annule && setInterne({ statut: "pret", climat: ClimatSchema.parse(json) }))
      .catch(() => !annule && setInterne({ statut: "erreur" }));
    return () => {
      annule = true;
    };
  }, [region, pilote, initial, essai]);

  if (interne.statut === "erreur") return { statut: "erreur", reessayer };
  // Tant que le climat chargé n'est pas celui de la région demandée, on est en chargement (jamais l'ancienne région).
  if (interne.statut === "pret" && (interne.climat.meta?.region ?? pilote) !== region) return { statut: "chargement" };
  return interne;
}
