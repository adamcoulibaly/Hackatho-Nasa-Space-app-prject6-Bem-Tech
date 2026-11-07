import Link from "next/link";

export function NeedParcelle() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[28px] bg-white p-8">
      <h2 className="m-0 font-display text-2xl font-bold tracking-[-0.03em]">Commencez par situer votre champ</h2>
      <p className="m-0 max-w-xl text-base leading-relaxed text-muted">
        Pour afficher le climat et comparer les rotations, ForoSat a besoin de savoir où se trouve votre parcelle, ce que vous cultivez et ce qui compte pour vous.
      </p>
      <Link href="/parcelle" className="inline-flex h-14 items-center rounded-full bg-orange px-6 text-[17px] font-bold text-ink no-underline hover:text-ink">
        Aller à l'étape 1
      </Link>
    </div>
  );
}
