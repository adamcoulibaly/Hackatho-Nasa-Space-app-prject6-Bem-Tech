"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ecouterNatif, estModeApp, ouvrirDansApp } from "@/lib/modeApp";

/**
 * Dans l'app mobile : masque l'en-tête et la barre du bas du site (l'app fournit les siens),
 * confie à l'app les liens vers la page d'un autre onglet, et suit ses demandes (aller vers une page, relire la parcelle).
 */
export function ModeApp() {
  const router = useRouter();
  useEffect(() => {
    if (!estModeApp()) return;
    document.documentElement.classList.add("mode-app");

    const surClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const lien = (e.target as Element | null)?.closest?.("a[href]");
      if (!(lien instanceof HTMLAnchorElement) || lien.target === "_blank") return;
      const url = new URL(lien.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (ouvrirDansApp(url.pathname + url.search)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("click", surClic, true);
    const arreter = ecouterNatif((m) => {
      if (m.type === "aller") router.push(m.chemin);
      else if (m.type === "sync") window.dispatchEvent(new Event("forosat:sync"));
    });
    return () => {
      window.removeEventListener("click", surClic, true);
      arreter();
    };
  }, [router]);
  return null;
}
