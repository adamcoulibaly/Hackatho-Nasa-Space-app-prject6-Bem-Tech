"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Couche } from "@/lib/contract";
import { ouvrirDansApp } from "@/lib/modeApp";
import { Repli } from "./Repli";
import { useParcelle } from "@/lib/parcelle/context";
import { CarteParcelle } from "./CarteParcelle";
import { ParcelleForm } from "./ParcelleForm";
import { PhotoChamp } from "./PhotoChamp";

export function ParcelleView({ couches }: { couches: Couche[] }) {
  const router = useRouter();
  const { marquerSaisie, parcelle } = useParcelle();
  // Point de la photo : centre du contour dessiné ; sans lui, pas de comparaison satellite (le chef-lieu est une ville).
  const [lat, lon] = parcelle.centre ?? [undefined, undefined];
  return (
    <div className="flex flex-wrap items-stretch gap-5">
      <CarteParcelle couches={couches} />
      <ParcelleForm
        onSubmit={() => {
          marquerSaisie();
          // Parcours court : la réponse (les rotations) tout de suite ; le climat reste à un toucher.
          // Dans l'app mobile, les rotations s'ouvrent dans leur onglet.
          if (!ouvrirDansApp("/rotations")) router.push("/rotations");
        }}
      />
      <div className="w-full">
        <Repli titre="Photographier mon champ" sous="Votre photo comparée à ce que voit le satellite de la NASA.">
          <PhotoChamp region={parcelle.region} lat={lat} lon={lon} />
        </Repli>
      </div>
      <Link href="/suivi" className="flex w-full items-center justify-between gap-3 rounded-3xl bg-white p-[18px] text-ink no-underline hover:text-ink">
        <span className="flex flex-col gap-1">
          <strong className="text-[15px]">Mon carnet de suivi</strong>
          <span className="text-sm text-muted">Notez l&apos;état de vos cultures au fil de la saison.</span>
        </span>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>
    </div>
  );
}
