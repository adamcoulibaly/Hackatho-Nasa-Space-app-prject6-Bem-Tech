"use client";

import { useEffect } from "react";
import { estModeApp } from "@/lib/modeApp";

/** Dans l'app mobile, masque l'en-tête et la barre du bas du site : l'app fournit les siens. */
export function ModeApp() {
  useEffect(() => {
    if (estModeApp()) document.documentElement.classList.add("mode-app");
  }, []);
  return null;
}
