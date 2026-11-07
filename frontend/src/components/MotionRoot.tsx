"use client";

import { useEffect } from "react";

/** Blocs révélés à leur entrée à l'écran (voir globals.css). */
const SELECTEUR = "main > *, [data-stagger] > *, [data-reveal]";

/**
 * Révèle les blocs de chaque page quand ils entrent à l'écran, au chargement comme au défilement.
 * Sans IntersectionObserver, la classe `js-motion` n'est pas posée : tout reste visible, sans animation.
 */
export function MotionRoot() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const racine = document.documentElement;
    racine.classList.add("js-motion");

    const io = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-inview", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );
    const suivre = (el: Element) => {
      if (!el.hasAttribute("data-inview")) io.observe(el);
    };
    document.querySelectorAll(SELECTEUR).forEach(suivre);

    // Contenu ajouté après coup : changement de page, parcelle chargée, onglet ouvert…
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(SELECTEUR)) suivre(n);
          n.querySelectorAll(SELECTEUR).forEach(suivre);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      racine.classList.remove("js-motion");
    };
  }, []);
  return null;
}
