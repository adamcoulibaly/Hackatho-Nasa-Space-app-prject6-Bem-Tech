import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-[1360px] flex-col items-start gap-4 px-6 py-16">
        <h1 className="m-0 font-display text-4xl font-bold tracking-[-0.04em]">Page introuvable</h1>
        <p className="m-0 max-w-xl text-base leading-relaxed text-muted">Cette page n'existe pas ou la rotation demandée est inconnue.</p>
        <Link href="/" className="inline-flex h-14 items-center rounded-full bg-orange px-6 text-[17px] font-bold text-ink no-underline hover:text-ink">Retour à l'accueil</Link>
      </main>
    </>
  );
}
