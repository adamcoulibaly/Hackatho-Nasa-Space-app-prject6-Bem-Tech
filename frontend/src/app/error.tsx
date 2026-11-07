"use client";

import { useEffect } from "react";

export default function ErreurGlobale({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex max-w-[1360px] flex-col items-start gap-4 px-6 py-16">
      <h1 className="m-0 font-display text-3xl font-bold tracking-[-0.04em]">Impossible de charger les données</h1>
      <p className="m-0 max-w-xl text-base leading-relaxed text-muted">Un problème est survenu. Rechargez la page ; si cela continue, revenez à l'accueil.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="h-14 rounded-full bg-orange px-6 text-[17px] font-bold text-ink">Recharger</button>
        <a href="/" className="inline-flex h-14 items-center rounded-full border border-ink px-6 text-[17px] font-bold text-ink no-underline hover:text-ink">Retour à l'accueil</a>
      </div>
    </main>
  );
}
