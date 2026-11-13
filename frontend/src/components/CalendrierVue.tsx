"use client";

import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useClimatRegion } from "@/lib/useClimatRegion";
import { useSaisons } from "@/lib/useSaisons";
import { useSemis } from "@/lib/useSemis";
import { CalendrierAgricole } from "./CalendrierAgricole";
import { EtatCalcul } from "./EtatCalcul";

export function CalendrierVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle, pret } = useParcelle();
  const climat = useClimatRegion(initial, parcelle.region);
  const saisons = useSaisons(parcelle.region);
  // Même état de semis que l'accueil : si la fenêtre de semis s'est ouverte, le calendrier part de cette date.
  const semis = useSemis(parcelle.region);
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
      semisDuJour={semis?.etat === "fenetre_ouverte" ? semis.depuis : undefined}
    />
  );
}
