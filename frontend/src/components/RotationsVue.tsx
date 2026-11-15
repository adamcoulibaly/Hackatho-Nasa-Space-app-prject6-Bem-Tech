"use client";

import Link from "next/link";

import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useRotations } from "@/lib/useRotations";
import { rotationConseillee } from "@/lib/moteur/rotations";
import { regionParId } from "@/lib/regions";
import { PrioritesRappel } from "./PrioritesRappel";
import { RotationCard } from "./RotationCard";
import { EtatCalcul } from "./EtatCalcul";
import { StrategiesMoyens } from "./StrategiesMoyens";
import { strategies } from "@/lib/moteur/strategies";
import { useSaisons } from "@/lib/useSaisons";
import { Rentabilite } from "./Rentabilite";
import { Repli } from "./Repli";
import { LIBELLE_CLASSE, meilleureAntiErosion } from "@/lib/pente";

const aujourdhuiIso = () => new Date().toISOString().slice(0, 10);

export function RotationsVue({ initial, cultures }: { initial: Climat; cultures: Culture[] }) {
  const { parcelle } = useParcelle();
  const etat = useRotations(initial, cultures, parcelle);
  const region = regionParId(parcelle.region);
  const saisons = useSaisons(parcelle.region);
  const entete = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Étape 2 sur 2{region ? ` · ${region.nom}` : ""}</span>
        <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">
          Trois chemins <span className="font-serif font-normal italic text-orange-dark">pour votre sol.</span>
        </h1>
      </div>
      <PrioritesRappel />
    </div>
  );
  if (etat.statut !== "pret") return <>{entete}<EtatCalcul etat={etat} region={parcelle.region} /></>;

  const reco = rotationConseillee(etat.rotations);
  const parMoyens = strategies(parcelle, etat.climat, cultures, saisons ?? null);
  return (
    <>
      {entete}
      <div data-stagger className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-stretch gap-4">
        {etat.rotations.map((r) => <RotationCard key={r.id} rotation={r} dark={r.recommandee} />)}
      </div>
      {parcelle.pente && parcelle.pente.classe !== "faible" && (() => {
        const m = meilleureAntiErosion(etat.rotations);
        const pct = parcelle.pente.moyenne.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
        return (
          <p role="note" data-testid="note-pente" className="m-0 rounded-2xl bg-[#FDE7CC] px-4 py-3 text-[15px] leading-normal text-[#5C2E00]">
            <strong>{LIBELLE_CLASSE[parcelle.pente.classe]} ({pct} %, altitude SRTM) :</strong> l&apos;eau de pluie emporte la terre. Sur le critère anti-érosion, la rotation {m.id} est la mieux notée ({m.scores.erosion}/5){m.recommandee ? ", et c'est aussi la rotation recommandée." : " : comparez-la à la rotation recommandée avant de choisir."}
          </p>
        );
      })()}
      <Link href="/simulateur" className="flex items-center justify-between gap-3 rounded-3xl bg-ink p-5 text-paper no-underline hover:text-paper">
        <span className="flex flex-col gap-1">
          <strong className="font-display text-lg">Simuler sur 3, 5 ou 10 ans</strong>
          <span className="text-sm text-[#C9D4CD]">Comparez les rotations dans le temps, en année sèche ou très pluvieuse, et voyez la parcelle évoluer.</span>
        </span>
        <span aria-hidden="true" className="text-2xl">→</span>
      </Link>
      <section className="flex flex-wrap items-center gap-6 rounded-[28px] bg-white p-[26px]">
        <div className="flex flex-[1_1_380px] flex-col gap-2">
          <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">{reco.id === "A" ? "Votre rotation actuelle reste la meilleure pour vos priorités" : `Pourquoi la rotation ${reco.id} ressort ?`}</h2>
          <ul className="m-0 flex flex-col gap-1 pl-5 text-base leading-relaxed text-muted">
            {reco.pourquoi.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
        <div className="flex flex-[1_1_300px] flex-col gap-2 rounded-[20px] bg-[#FDE7CC] p-[18px] text-[#5C2E00]">
          <span className="text-[15px] font-bold">À vérifier avant de décider</span>
          <span className="text-[15px] leading-normal">Prix au marché local, semences disponibles, avis d'un conseiller agricole. Les notes de revenu et de marché sont des estimations.</span>
        </div>
      </section>
      <div className="flex flex-col gap-3">
        {parMoyens && (
          <Repli titre="Selon vos moyens" sous="Économique, équilibrée ou rendement : la rotation adaptée à votre budget.">
            <StrategiesMoyens strategies={parMoyens} />
          </Repli>
        )}
        <Repli titre="Rentabilité avec vos prix" sous="Recettes et marges de chaque rotation, avec vos prix du marché.">
          <Rentabilite rotations={etat.rotations.map((r) => ({ id: r.id, sequence: r.sequence }))} saisons={saisons ?? null} cultures={cultures} surface={parcelle.surface} aujourdhui={aujourdhuiIso()} />
        </Repli>
      </div>
    </>
  );
}
