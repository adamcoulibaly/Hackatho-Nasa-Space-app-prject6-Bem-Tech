"use client";

import Link from "next/link";
import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { lireLienFiche, lienFiche } from "@/lib/moteur/fiche-lien";
import { useRotations } from "@/lib/useRotations";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";
import { Fiche } from "./Fiche";
import { ShareActions } from "./ShareActions";
import { EtatCalcul } from "./EtatCalcul";

/** Fiche d'une rotation : depuis le lien partagé (paramètres), sinon depuis la parcelle de l'appareil. */
export function FicheVue({ id, initial, cultures, params }: { id: "A" | "B" | "C"; initial: Climat; cultures: Culture[]; params: URLSearchParams }) {
  const local = useParcelle();
  const depuisLien = [...params.keys()].length > 0;
  const parcelleLien = depuisLien ? lireLienFiche(params) : null;
  const parcelle = parcelleLien ?? (local.saisie ? local.parcelle : null);
  const etat = useRotations(initial, cultures, parcelle ?? DEFAULT_PARCELLE);

  if (!depuisLien && !local.pret) return <div aria-busy="true" className="min-h-[200px]" />;
  if (!parcelle) {
    return (
      <div className="mx-auto flex w-full max-w-[540px] flex-col items-start gap-3 rounded-[28px] bg-white p-6">
        <h1 className="m-0 font-display text-2xl font-bold">Lien incomplet</h1>
        <p className="m-0 text-base text-muted">Ce lien ne contient pas toutes les informations de la parcelle. Demandez à la personne de vous le renvoyer depuis ForoSat.</p>
        <Link href="/" className="inline-flex h-12 items-center rounded-full bg-orange px-5 font-bold text-ink no-underline hover:text-ink">Retour à l'accueil</Link>
      </div>
    );
  }
  if (etat.statut !== "pret") return <EtatCalcul etat={etat} region={parcelle.region} />;
  const rotation = etat.rotations.find((r) => r.id === id)!;
  return (
    <>
      <Link href={`/rotations/${id}`} className="no-print inline-flex min-h-[44px] items-center text-sm font-semibold">← Détail de la rotation {id}</Link>
      <Fiche rotation={rotation} />
      <ShareActions rotation={rotation} lien={lienFiche(id, parcelle)} />
    </>
  );
}
