import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { PrioritesRappel } from "@/components/PrioritesRappel";
import { RotationCard } from "@/components/RotationCard";
import { getRotations } from "@/lib/data";

export const metadata = { title: "Comparer les rotations — ForoSat" };

export default async function RotationsPage() {
  const rotations = await getRotations();
  const reco = rotations.find((r) => r.recommandee) ?? rotations[0];
  return (
    <>
      <ParcelleHeader current="rotations" />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-6 px-6 pb-14 pt-8">
        <RequireParcelle>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Étape 3 sur 3 · valeurs d'exemple</span>
              <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">
                Trois chemins <span className="font-serif font-normal italic text-orange-dark">pour votre sol.</span>
              </h1>
            </div>
            <PrioritesRappel />
          </div>
          <p role="note" className="m-0 self-start rounded-2xl bg-[#FDE7CC] px-4 py-3 text-[15px] text-[#5C2E00]">
            Exemple de démonstration : vos choix ne modifient pas encore ce résultat. Le moteur de recommandation sera branché ensuite.
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-stretch gap-4">
            {rotations.map((r) => <RotationCard key={r.id} rotation={r} dark={r.recommandee} />)}
          </div>
          <section className="flex flex-wrap items-center gap-6 rounded-[28px] bg-white p-[26px]">
            <div className="flex flex-[1_1_380px] flex-col gap-2">
              <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">Pourquoi la rotation {reco.id} ressort ?</h2>
              <p className="m-0 text-base leading-relaxed text-muted">{reco.note}</p>
            </div>
            <div className="flex flex-[1_1_300px] flex-col gap-2 rounded-[20px] bg-[#FDE7CC] p-[18px] text-[#5C2E00]">
              <span className="text-[15px] font-bold">À vérifier avant de décider</span>
              <span className="text-[15px] leading-normal">Prix de l'arachide au marché local, semences disponibles, avis d'un conseiller agricole.</span>
            </div>
          </section>
        </RequireParcelle>
      </main>
    </>
  );
}
