import Link from "next/link";
import { regionParId } from "@/lib/regions";
import type { EtatRotations } from "@/lib/useRotations";

/** Messages de chargement, d'erreur ou de parcelle vide, communs aux écrans de rotations. */
export function EtatCalcul({ etat, region }: { etat: Exclude<EtatRotations, { statut: "pret" }>; region: string }) {
  const lieu = regionParId(region)?.chefLieu ?? "votre région";
  if (etat.statut === "chargement") return <p aria-busy="true" className="m-0 rounded-2xl bg-white px-4 py-6 text-[15px] text-muted">Calcul des rotations pour {lieu}…</p>;
  if (etat.statut === "erreur")
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#FDE7CC] px-4 py-4 text-[#5C2E00]">
        <p role="alert" className="m-0 text-[15px]">Impossible de charger le climat de {lieu}. Vérifiez la connexion.</p>
        <button type="button" onClick={etat.reessayer} className="h-11 rounded-full bg-ink px-5 text-sm font-bold text-paper">Réessayer</button>
      </div>
    );
  return (
    <p className="m-0 rounded-2xl bg-white px-4 py-4 text-[15px]">
      Indiquez au moins une culture à l'étape 1 pour calculer les rotations. <Link href="/parcelle">Aller à l'étape 1</Link>
    </p>
  );
}
