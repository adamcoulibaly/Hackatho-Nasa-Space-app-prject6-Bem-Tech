"use client";

import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useRotations } from "@/lib/useRotations";
import { rotationConseillee } from "@/lib/moteur/rotations";
import { Tableau } from "./Tableau";
import { EtatCalcul } from "./EtatCalcul";
import { useSemis } from "@/lib/useSemis";
import { useEffect } from "react";
import { envoyerParcelle } from "@/lib/modeApp";
import { prochaineCulture } from "@/lib/whatsapp";
import { AlerteSemis } from "./AlerteSemis";
import Link from "next/link";

export function TableauVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle } = useParcelle();
  const etat = useRotations(initial, cultures, parcelle);
  const semis = useSemis(parcelle.region);
  const reco = etat.statut === "pret" ? rotationConseillee(etat.rotations) : null;
  const culture = reco ? prochaineCulture(reco).culture : null;
  // L'app garde la région et la culture à semer pour l'alerte de semis.
  useEffect(() => {
    envoyerParcelle(parcelle.region, culture);
  }, [parcelle.region, culture]);
  if (etat.statut !== "pret") return <EtatCalcul etat={etat} region={parcelle.region} />;
  return (
    <>
      <Tableau climat={etat.climat} reco={rotationConseillee(etat.rotations)} semis={semis} />
      <AlerteSemis />
      <Link href="/suivi" className="flex items-center justify-between gap-3 rounded-3xl bg-white p-[18px] text-ink no-underline hover:text-ink">
        <span className="flex flex-col gap-1">
          <strong className="text-[15px]">Mon carnet de suivi</strong>
          <span className="text-sm text-muted">Notez ce que vous voyez dans votre champ, comparé aux prévisions.</span>
        </span>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>
    </>
  );
}
