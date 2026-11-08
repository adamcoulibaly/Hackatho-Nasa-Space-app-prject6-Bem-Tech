"use client";

import { useRouter } from "next/navigation";
import type { Couche } from "@/lib/contract";
import { ouvrirDansApp } from "@/lib/modeApp";
import { useParcelle } from "@/lib/parcelle/context";
import { CarteParcelle } from "./CarteParcelle";
import { ParcelleForm } from "./ParcelleForm";
import { PhotoChamp } from "./PhotoChamp";
import { regionParId } from "@/lib/regions";

export function ParcelleView({ couches }: { couches: Couche[] }) {
  const router = useRouter();
  const { marquerSaisie, parcelle } = useParcelle();
  // Point de la photo : centre du contour dessiné, sinon chef-lieu de la région.
  const chefLieu = regionParId(parcelle.region);
  const [lat, lon] = parcelle.centre ?? [chefLieu?.lat ?? 9.458, chefLieu?.lon ?? -5.6316];
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
