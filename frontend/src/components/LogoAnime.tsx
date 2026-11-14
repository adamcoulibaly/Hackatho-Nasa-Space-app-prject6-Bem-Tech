"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

/** Logo dont le satellite tourne sur son orbite ; immobile si l'appareil demande moins de mouvement. */
export function LogoAnime({ size }: { size?: number }) {
  const [anime, setAnime] = useState(false);
  useEffect(() => {
    setAnime(typeof window.matchMedia !== "function" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return <Logo size={size} anime={anime} />;
}
