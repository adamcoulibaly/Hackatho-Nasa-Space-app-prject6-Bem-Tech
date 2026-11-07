"use client";

import { useRouter } from "next/navigation";
import type { Couche } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { CarteParcelle } from "./CarteParcelle";
import { ParcelleForm } from "./ParcelleForm";

export function ParcelleView({ couches }: { couches: Couche[] }) {
  const router = useRouter();
  const { marquerSaisie } = useParcelle();
  return (
    <div className="flex flex-wrap items-stretch gap-5">
      <CarteParcelle couches={couches} />
      <ParcelleForm
        onSubmit={() => {
          marquerSaisie();
          router.push("/climat");
        }}
      />
    </div>
  );
}
