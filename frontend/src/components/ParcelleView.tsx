"use client";

import { useRouter } from "next/navigation";
import type { Couche } from "@/lib/contract";
import { ouvrirDansApp } from "@/lib/modeApp";
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
          // Dans l'app mobile, le climat s'ouvre dans son onglet.
          if (!ouvrirDansApp("/climat")) router.push("/climat");
        }}
      />
      <div className="w-full">
        <PhotoChamp region={parcelle.region} lat={lat} lon={lon} />
      </div>
    </div>
  );
}
