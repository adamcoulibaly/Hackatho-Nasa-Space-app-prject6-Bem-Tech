"use client";

import { useRouter } from "next/navigation";
import type { Couche } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { LayerMap } from "./LayerMap";
import { ParcelleForm } from "./ParcelleForm";

export function ParcelleView({ couches }: { couches: Couche[] }) {
  const router = useRouter();
  const { parcelle, marquerSaisie } = useParcelle();
  return (
    <div className="flex flex-wrap items-stretch gap-5">
      <LayerMap couches={couches} surface={parcelle.surface} />
      <ParcelleForm
        onSubmit={() => {
          marquerSaisie();
          router.push("/climat");
        }}
      />
    </div>
  );
}
