"use client";

import Link from "next/link";
import { useParcelle } from "@/lib/parcelle/context";

export function PrioritesRappel() {
  const { parcelle } = useParcelle();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Vos priorités :</span>
      {parcelle.priorites.map((p) => (
        <span key={p} className="rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-paper">{p}</span>
      ))}
      <Link href="/parcelle" className="inline-flex min-h-[44px] items-center px-1.5 text-sm font-semibold">Modifier</Link>
    </div>
  );
}
