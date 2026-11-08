"use client";

import Link from "next/link";
import type { Climat } from "@/lib/contract";
import { useClimatRegion } from "@/lib/useClimatRegion";
import { useParcelle } from "@/lib/parcelle/context";
import { regionParId } from "@/lib/regions";
import { RainChart } from "./RainChart";
import { YearMatrix } from "./YearMatrix";
import { GraceChart } from "./GraceChart";
import { AlertCard } from "./AlertCard";
import { ClimatTabs } from "./ClimatTabs";

const Card = ({ titre, aide, children, className = "" }: { titre: string; aide?: string; children: React.ReactNode; className?: string }) => (
  <section className={`flex flex-col gap-4 rounded-[28px] bg-white p-[26px] ${className}`}>
    <div className="flex flex-wrap items-baseline justify-between gap-2.5">
      <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">{titre}</h2>
      {aide && <span className="text-sm text-muted">{aide}</span>}
    </div>
    {children}
  </section>
);

/** Climat de la région choisie (voir useClimatRegion). */
export function ClimatVue({ initial }: { initial: Climat }) {
  const { parcelle } = useParcelle();
  const region = regionParId(parcelle.region);
  const etat = useClimatRegion(initial, parcelle.region);

  const entete = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Étape 2 sur 3{region ? ` · ${region.nom}` : ""}</span>
        <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">
          Le climat de votre champ, <span className="font-serif font-normal italic text-green-dark">vu de l'espace.</span>
        </h1>
      </div>
      <Link href="/rotations" className="inline-flex h-[52px] items-center rounded-full bg-orange px-6 text-base font-bold text-ink no-underline hover:text-ink">Voir les 3 rotations</Link>
    </div>
  );

  if (etat.statut === "chargement") {
    return (
      <>
        {entete}
        <p aria-busy="true" className="m-0 rounded-2xl bg-white px-4 py-6 text-[15px] text-muted">Chargement du climat de {region?.chefLieu ?? "votre région"}…</p>
      </>
    );
  }
  if (etat.statut === "erreur") {
    return (
      <>
        {entete}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#FDE7CC] px-4 py-4 text-[#5C2E00]">
          <p role="alert" className="m-0 text-[15px]">Impossible de charger le climat de {region?.chefLieu ?? "cette région"}. Vérifiez la connexion.</p>
          <button type="button" onClick={etat.reessayer} className="h-11 rounded-full bg-ink px-5 text-sm font-bold text-paper">Réessayer</button>
        </div>
      </>
    );
  }

  const climat = etat.climat;
  return (
    <>
      {entete}
      {climat.meta && (
        <p role="note" className="m-0 rounded-2xl bg-[#D7F0E2] px-4 py-3 text-[15px] leading-normal text-[#00502B]">
          <strong>Données réelles :</strong> {climat.meta.reel.join(" et ")} ({climat.meta.source}, {climat.meta.periode}).
          {climat.meta.tendancePluie ? ` ${climat.meta.tendancePluie}` : ""}{" "}
          {climat.grace && climat.onglets.some((o) => o.id === "veg")
            ? ""
            : "La végétation (NDVI) et l'eau stockée (GRACE) s'afficheront dès que le compte NASA Earthdata sera branché."}
        </p>
      )}
      <div data-stagger className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5">
        {climat.indicateurs.map((k, i) => (
          <div key={k.label} className={`lift flex flex-col gap-2.5 rounded-3xl p-[22px] ${i === 0 ? "bg-ink text-paper" : "bg-white"}`}>
            <span className={`text-sm ${i === 0 ? "text-[#9DB0A5]" : "text-muted"}`}>{k.label}</span>
            <span className={`font-display text-[30px] font-bold tracking-[-0.03em] ${k.accent ? "text-orange-dark" : ""}`}>{k.valeur}</span>
            <span className={`text-[13px] ${i === 0 ? "text-[#9DB0A5]" : "text-muted"}`}>{k.source}</span>
          </div>
        ))}
      </div>

      <div className="md:hidden"><ClimatTabs key={climat.meta?.region} onglets={climat.onglets} /></div>
      <Card className="max-md:hidden" titre="Pluie mois par mois" aide="Moyenne en mm · les bandes claires marquent les saisons des pluies">
        <RainChart mois={climat.pluieMensuelle} saisons={climat.saisons ?? [climat.saisonPluies]} />
      </Card>
      <Card className="max-md:hidden" titre="L'année d'un coup d'œil" aide="Plus la case est foncée, plus la valeur est élevée">
        <YearMatrix lignes={climat.matrice} />
      </Card>
      {climat.grace && (
        <Card titre="L'eau stockée dans la zone, sur 20 ans">
          <GraceChart data={climat.grace} />
          <p className="m-0 text-[15px] leading-normal text-muted">
            Écart à la moyenne de la réserve d'eau totale (GRACE puis GRACE-FO). Les colonnes hachurées marquent une <strong className="text-ink">lacune de données</strong> : la fin de GRACE en 2017 et le lancement de GRACE-FO en 2018. Mesure à grande échelle (plusieurs centaines de km) : elle décrit la région, pas la parcelle.
          </p>
        </Card>
      )}
      <div data-stagger className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
        {climat.alertes.map((a) => <AlertCard key={a.titre} alerte={a} />)}
      </div>
    </>
  );
}
