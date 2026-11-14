"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Menus déroulants du haut : un seul ouvert à la fois, fermés au toucher ailleurs et à chaque changement de page. */
export function FermerMenus() {
  const chemin = usePathname();
  useEffect(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[data-menu]").forEach((d) => (d.open = false));
  }, [chemin]);
  useEffect(() => {
    const ailleurs = (e: Event) => {
      document.querySelectorAll<HTMLDetailsElement>("details[data-menu][open]").forEach((d) => {
        if (!d.contains(e.target as Node)) d.open = false;
      });
    };
    const unSeul = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (!d.matches?.("details[data-menu]") || !d.open) return;
      document.querySelectorAll<HTMLDetailsElement>("details[data-menu][open]").forEach((x) => x !== d && (x.open = false));
    };
    document.addEventListener("pointerdown", ailleurs);
    document.addEventListener("toggle", unSeul, true);
    return () => {
      document.removeEventListener("pointerdown", ailleurs);
      document.removeEventListener("toggle", unSeul, true);
    };
  }, []);
  return null;
}
