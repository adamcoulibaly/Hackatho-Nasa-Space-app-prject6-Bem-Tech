"use client";

import { useParcelle } from "@/lib/parcelle/context";
import { regionParId, REGION_PILOTE } from "@/lib/regions";

/** Hors de la zone pilote, rappelle que les rotations sont encore l'exemple calculé pour Korhogo. */
export function NoteRegion() {
  const { parcelle, pret } = useParcelle();
  if (!pret || parcelle.region === REGION_PILOTE) return null;
  const r = regionParId(parcelle.region);
  return (
    <p role="note" className="m-0 self-start rounded-2xl bg-[#E7ECE6] px-4 py-3 text-[15px] text-ink">
      Région {r?.nom ?? parcelle.region} : le climat affiché est le vôtre, mais les rotations ci-dessous sont l'exemple calculé pour Korhogo, en attendant le moteur par région.
    </p>
  );
}
