"use client";

import { useEffect, useState } from "react";

/** Enregistre le mode hors connexion (production seulement) et prévient quand le téléphone n'a plus internet. */
export function HorsLigne() {
  const [horsLigne, setHorsLigne] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const maj = () => setHorsLigne(!navigator.onLine);
    maj();
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);
  if (!horsLigne) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[1200] bg-[#3A2208] px-4 py-2 text-center text-sm font-semibold text-[#FFB066]">
      Hors connexion : vous voyez les dernières données consultées.
    </div>
  );
}
