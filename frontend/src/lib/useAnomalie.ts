"use client";

import { useEffect, useState } from "react";
import type { Anomalie } from "@/lib/satellite/anomalie";

/** Anomalie de végétation à la parcelle dessinée (null sans contour ou si les images manquent). */
export function useAnomalie(centre?: [number, number]): Anomalie | null {
  const [a, setA] = useState<Anomalie | null>(null);
  const cle = centre ? `${centre[0].toFixed(2)},${centre[1].toFixed(2)}` : "";
  useEffect(() => {
    if (!cle) return setA(null);
    let annule = false;
    const [lat, lon] = cle.split(",");
    fetch(`/api/anomalie?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => !annule && setA(j && typeof j.anomalie === "boolean" ? j : null))
      .catch(() => !annule && setA(null));
    return () => {
      annule = true;
    };
  }, [cle]);
  return a;
}
