"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef } from "react";
import { COULEUR_RISQUE, LIBELLE_RISQUE, type RisqueAffiche } from "./ListeRisques";

/** Carte des 33 régions : un disque par chef-lieu, coloré selon le risque climatique agricole. */
export function CarteRisques({ regions }: { regions: RisqueAffiche[] }) {
  const conteneur = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let carte: Leaflet.Map | null = null;
    let detruite = false;
    (async () => {
      const mod = await import("leaflet");
      const L = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      if (detruite || !conteneur.current) return;
      carte = L.map(conteneur.current, { center: [7.6, -5.5], zoom: 6, zoomSnap: 0.5, scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 12,
      }).addTo(carte);
      for (const r of regions) {
        L.circleMarker([r.lat, r.lon], { radius: 11, color: "#07120D", weight: 1, fillColor: COULEUR_RISQUE[r.niveau], fillOpacity: 0.85 })
          .bindTooltip(`${r.nom} : ${LIBELLE_RISQUE[r.niveau].toLowerCase()}`)
          .addTo(carte);
      }
      carte.fitBounds(L.latLngBounds(regions.map((r) => [r.lat, r.lon] as [number, number])), { padding: [24, 24] });
    })();
    return () => {
      detruite = true;
      carte?.remove();
    };
  }, [regions]);
  return <div ref={conteneur} className="h-[420px] w-full overflow-hidden rounded-[24px] bg-[#E8F1F7]" role="img" aria-label="Carte des risques climatiques agricoles par région" />;
}
