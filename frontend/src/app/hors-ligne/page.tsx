import Link from "next/link";

export const metadata = { title: "Hors connexion — ForoSat" };

/** Page servie par le mode hors connexion quand une page n'a jamais été consultée avec internet. */
export default function HorsLignePage() {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-6 py-16">
      <h1 className="m-0 font-display text-[32px] font-bold leading-tight tracking-[-0.04em]">Pas encore disponible hors connexion</h1>
      <p className="m-0 text-[17px] leading-normal text-muted">
        Cette page n&apos;a pas encore été ouverte avec internet sur ce téléphone. Les pages déjà consultées (accueil, climat, rotations, simulateur) restent disponibles.
      </p>
      <Link href="/tableau" className="inline-flex h-14 items-center self-start rounded-full bg-orange px-6 text-[17px] font-bold text-ink no-underline hover:text-ink">Retour à l&apos;accueil</Link>
    </main>
  );
}
