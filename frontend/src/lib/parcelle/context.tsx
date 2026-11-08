"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_PARCELLE, ParcelleSchema, type Parcelle } from "./validate";

const KEY = "forosat.parcelle";

type Stored = { parcelle: Parcelle; saisie: boolean };

type Ctx = {
  parcelle: Parcelle;
  saisie: boolean;
  /** Faux tant que le stockage local n'a pas été lu (évite un faux « pas de parcelle »). */
  pret: boolean;
  setParcelle: (p: Partial<Parcelle>) => void;
  marquerSaisie: () => void;
};

const ParcelleContext = createContext<Ctx | null>(null);

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { parcelle: DEFAULT_PARCELLE, saisie: false };
    const v = JSON.parse(raw) as Partial<Stored>;
    if (!v || typeof v !== "object" || !v.parcelle) throw new Error("format");
    const parcelle = ParcelleSchema.safeParse({ ...DEFAULT_PARCELLE, ...v.parcelle });
    if (!parcelle.success) throw new Error("types");
    return { parcelle: parcelle.data, saisie: v.saisie === true };
  } catch {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* stockage indisponible */
    }
    return { parcelle: DEFAULT_PARCELLE, saisie: false };
  }
}

function write(s: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* stockage indisponible : l'état reste en mémoire */
  }
}

export function ParcelleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>({ parcelle: DEFAULT_PARCELLE, saisie: false });
  const [pret, setPret] = useState(false);

  useEffect(() => {
    setState(read());
    setPret(true);
    // Un autre onglet (navigateur ou app mobile) a pu changer la parcelle : on la relit.
    const relire = (e: Event) => {
      if (e instanceof StorageEvent && e.key !== null && e.key !== KEY) return;
      if (e.type === "visibilitychange" && document.visibilityState !== "visible") return;
      setState(read());
    };
    const evenements = ["storage", "focus", "forosat:sync"] as const;
    for (const ev of evenements) window.addEventListener(ev, relire);
    document.addEventListener("visibilitychange", relire);
    return () => {
      for (const ev of evenements) window.removeEventListener(ev, relire);
      document.removeEventListener("visibilitychange", relire);
    };
  }, []);

  const setParcelle = useCallback((p: Partial<Parcelle>) => {
    setState((prev) => {
      const next = { ...prev, parcelle: { ...prev.parcelle, ...p } };
      write(next);
      return next;
    });
  }, []);

  const marquerSaisie = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, saisie: true };
      write(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ parcelle: state.parcelle, saisie: state.saisie, pret, setParcelle, marquerSaisie }),
    [state, pret, setParcelle, marquerSaisie],
  );
  return <ParcelleContext.Provider value={value}>{children}</ParcelleContext.Provider>;
}

export function useParcelle(): Ctx {
  const ctx = useContext(ParcelleContext);
  if (!ctx) throw new Error("useParcelle doit être utilisé dans ParcelleProvider");
  return ctx;
}
