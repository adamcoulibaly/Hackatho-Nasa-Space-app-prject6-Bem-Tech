"use client";

import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useClimatRegion } from "@/lib/useClimatRegion";
import { useSaisons } from "@/lib/useSaisons";
import { CalendrierAgricole } from "./CalendrierAgricole";
import { EtatCalcul } from "./EtatCalcul";

export function CalendrierVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle, pret } = useParcelle();
  const climat = useClimatRegion(initial, parcelle.region);
  const saisons = useSaisons(parcelle.region);
  if (!pret) return null;
  if (climat.statut !== "pret") return <EtatCalcul etat={climat} region={parcelle.region} />;
  const c = climat.climat;
  return (
    <CalendrierAgricole
      key={parcelle.region}
      cultures={cultures}
      mesCultures={parcelle.cultures}
      saisons={saisons ?? null}
      saisonsRegion={c.saisons ?? [c.saisonPluies]}
      aujourdhui={new Date().toISOString().slice(0, 10)}
    />
  );
}
