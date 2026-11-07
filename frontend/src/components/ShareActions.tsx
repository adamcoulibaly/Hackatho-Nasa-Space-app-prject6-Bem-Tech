"use client";

import { useEffect, useState } from "react";
import type { Rotation } from "@/lib/contract";
import { whatsappUrl } from "@/lib/whatsapp";

export function ShareActions({ rotation }: { rotation: Rotation }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <div className="no-print mx-auto flex w-full max-w-[540px] flex-wrap gap-3">
      <a
        href={whatsappUrl(rotation, origin)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-14 flex-1 items-center justify-center rounded-full bg-green-dark px-5 text-base font-bold text-white no-underline hover:text-white"
      >
        Envoyer sur WhatsApp
      </a>
      <button type="button" onClick={() => window.print()} className="h-14 flex-1 rounded-full bg-ink px-5 text-base font-bold text-paper">
        Imprimer / PDF
      </button>
    </div>
  );
}
