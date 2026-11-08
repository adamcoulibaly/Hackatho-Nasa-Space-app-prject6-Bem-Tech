"use client";

import { useEffect, useState } from "react";
import type { Rotation } from "@/lib/contract";
import { whatsappUrl } from "@/lib/whatsapp";
import { envoyerAuNatif } from "@/lib/modeApp";

export function ShareActions({ rotation, lien }: { rotation: Rotation; lien: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <div className="no-print mx-auto flex w-full max-w-[540px] flex-wrap gap-3">
      <a
        href={whatsappUrl(rotation, `${origin}${lien}`)}
        onClick={(e) => {
          const texte = `ForoSat — rotation ${rotation.id} : ${rotation.sequence.join(" → ")}`;
          if (envoyerAuNatif({ type: "partager", url: `${origin}${lien}`, texte })) e.preventDefault();
        }}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-14 min-w-[200px] flex-1 items-center justify-center whitespace-nowrap rounded-full bg-green-dark px-5 text-base font-bold text-white no-underline hover:text-white"
      >
        Envoyer sur WhatsApp
      </a>
      <button type="button" onClick={() => window.print()} className="no-app h-14 min-w-[200px] flex-1 whitespace-nowrap rounded-full bg-ink px-5 text-base font-bold text-paper">
        Imprimer / PDF
      </button>
    </div>
  );
}
