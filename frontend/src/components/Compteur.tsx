"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Nombre qui monte de 0 à sa valeur quand il entre à l'écran (600 ms, ralenti à la fin).
 * Sans IntersectionObserver ou avec « mouvement réduit », la valeur s'affiche directement.
 */
export function Compteur({ valeur, duree = 600, format = (n: number) => String(n) }: { valeur: number; duree?: number; format?: (n: number) => string }) {
  const [affiche, setAffiche] = useState(valeur);
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const reduit = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // La vraie valeur reste affichée tant que le nombre n'est pas à l'écran (capture, impression, lecteur d'écran).
    setAffiche(valeur);
    if (!("IntersectionObserver" in window) || reduit || !el.current) return;
    let minuterie: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver((entrees) => {
      if (!entrees.some((e) => e.isIntersecting)) return;
      io.disconnect();
      setAffiche(0);
      const debut = Date.now();
      minuterie = setInterval(() => {
        const t = Math.min(1, (Date.now() - debut) / duree);
        setAffiche(Math.round(valeur * (1 - Math.pow(1 - t, 3))));
        if (t >= 1 && minuterie) clearInterval(minuterie);
      }, 16);
    });
    io.observe(el.current);
    return () => {
      io.disconnect();
      if (minuterie) clearInterval(minuterie);
    };
  }, [valeur, duree]);
  return (
    <span ref={el} className="tabular-nums">
      {format(affiche)}
    </span>
  );
}
