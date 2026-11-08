import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Espace conseiller — ForoSat" };

export default function ConseillerPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-6 px-6 pb-14 pt-8">
        <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">
          Vos agriculteurs, <span className="font-serif font-normal italic text-green-dark">parcelle par parcelle.</span>
        </h1>
        <section className="flex flex-col items-start gap-4 rounded-[28px] bg-white p-8">
          <h2 className="m-0 font-display text-xl font-bold">Aucun agriculteur suivi pour l'instant</h2>
          <p className="m-0 max-w-2xl text-base leading-relaxed text-muted">
            Beaucoup d'agriculteurs n'ont pas de smartphone. Le conseiller fait l'analyse avec eux et leur transmet la fiche par WhatsApp ou imprimée. Le suivi de plusieurs agriculteurs arrivera après le hackathon ; en attendant, analysez une parcelle avec l'agriculteur et partagez sa fiche.
          </p>
          <Link href="/parcelle" className="inline-flex h-14 items-center rounded-full bg-orange px-6 text-[17px] font-bold text-ink no-underline hover:text-ink">Analyser une parcelle</Link>
        </section>
      </main>
    </>
  );
}
