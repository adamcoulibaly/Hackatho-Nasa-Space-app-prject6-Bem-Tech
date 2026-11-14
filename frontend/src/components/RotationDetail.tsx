"use client";

import Link from "next/link";
import type { Climat, Culture } from "@/lib/contract";
import { useParcelle } from "@/lib/parcelle/context";
import { useRotations } from "@/lib/useRotations";
import { lienFiche } from "@/lib/moteur/fiche-lien";
import { CalendrierTrois } from "./CalendrierTrois";
import { FriseRejeu } from "./FriseRejeu";
import { Projection2050 } from "./Projection2050";
import { phrase2050 } from "@/lib/moteur/projection";
import { ConfianceBreakdown } from "./ConfianceBreakdown";
import { RainSimulator } from "./RainSimulator";
import { AssistantIA } from "./AssistantIA";
import { EtatCalcul } from "./EtatCalcul";
import { Repli } from "./Repli";

const Section = ({ titre, children }: { titre: string; children: React.ReactNode }) => (
  <section className="flex min-w-0 flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-[26px]">
    <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">{titre}</h2>
    {children}
  </section>
);

export function RotationDetail({ id, initial, cultures }: { id: "A" | "B" | "C"; initial: Climat; cultures: Culture[] }) {
  const { parcelle, pret } = useParcelle();
  const etat = useRotations(initial, cultures, parcelle);
  const retour = <Link href="/rotations" className="inline-flex min-h-[44px] items-center text-sm font-semibold">← Toutes les rotations</Link>;
  if (!pret) return <>{retour}</>;
  if (etat.statut !== "pret") return <>{retour}<EtatCalcul etat={etat} region={parcelle.region} /></>;
  const rotation = etat.rotations.find((r) => r.id === id)!;

  const ids = etat.rotations.map((r) => r.id as "A" | "B" | "C");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {retour}
        {/* Passer d'une rotation à l'autre sans revenir à la liste. */}
        <nav aria-label="Changer de rotation" className="flex gap-1 rounded-full bg-white p-1">
          {etat.rotations.map((r) => (
            <Link key={r.id} href={`/rotations/${r.id}`} aria-current={r.id === id ? "page" : undefined}
              className={`flex h-10 min-w-[52px] items-center justify-center rounded-full px-3 text-[15px] font-bold no-underline ${r.id === id ? "bg-ink text-paper hover:text-paper" : "text-ink hover:text-ink"}`}>
              {r.id}{r.recommandee ? " ★" : ""}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] uppercase tracking-[0.14em] text-muted">{rotation.tag}</span>
          <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">Rotation {rotation.id}</h1>
        </div>
        <Link href={lienFiche(rotation.id as "A" | "B" | "C", parcelle)} className="inline-flex h-[52px] items-center rounded-full bg-orange px-6 text-base font-bold text-ink no-underline hover:text-ink">Partager la fiche</Link>
      </div>

      <ol data-stagger className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5 p-0">
        {rotation.sequence.map((culture, i) => (
          <li key={culture + i} className={`lift flex flex-col gap-1.5 rounded-3xl p-[22px] ${rotation.recommandee && i === 0 ? "bg-ink text-paper" : "bg-white"}`}>
            <span className="text-[13px] uppercase tracking-[0.12em] opacity-70">{`Année ${i + 1}`}</span>
            <span className="font-display text-[30px] font-bold tracking-[-0.03em]">{culture}</span>
          </li>
        ))}
      </ol>

      <Section titre="Pourquoi cette rotation">
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {rotation.pourquoi.map((p, i) => (
            <li key={p} className="flex gap-3 text-base leading-normal">
              <span className="font-display font-bold text-orange-dark">{String(i + 1).padStart(2, "0")}</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </Section>

      {rotation.rejeu && rotation.rejeu.total > 0 && (
        <Section titre={`Rejouée sur ${rotation.rejeu.total} saisons réelles`}><FriseRejeu rejeu={rotation.rejeu} /></Section>
      )}

      {rotation.projection && (
        <Section titre="Votre champ vers 2050">
          <Projection2050 projection={rotation.projection} phrase={phrase2050(etat.rotations)} />
        </Section>
      )}

      <Section titre="Demander à l'assistant IA">
        <p className="m-0 text-[15px] text-muted">Posez votre question, ou comparez cette rotation aux autres en un toucher.</p>
        <AssistantIA id={id} parcelle={parcelle} autres={ids.filter((x) => x !== id)} />
      </Section>

      <div className="flex flex-col gap-3">
        <Repli titre="Le calendrier sur 3 ans"><CalendrierTrois calendrier={rotation.calendrier} /></Repli>
        <Repli titre="Et si… la pluie ou la chaleur changeait ?"><RainSimulator rotations={etat.rotations} courante={rotation.id} /></Repli>
        <Repli titre="Ce que disent les données">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rotation.donnees.map((d) => (
              <li key={d.source + d.texte} className="flex flex-col gap-0.5 text-[15px] leading-normal">
                <strong className="text-sm">{d.source}</strong>
                <span className="text-muted">{d.texte}</span>
              </li>
            ))}
          </ul>
        </Repli>
        <Repli titre="Risques, lacunes et confiance">
          {rotation.risques.length > 0 ? (
            <ul className="m-0 flex flex-col gap-2 pl-5 text-[15px] leading-normal">
              {rotation.risques.map((r) => <li key={r}>{r}</li>)}
            </ul>
          ) : (
            <p className="m-0 text-[15px] text-muted">Aucun risque particulier détecté par les règles.</p>
          )}
          <p className="m-0 rounded-2xl bg-[#FDE7CC] p-3.5 text-[15px] text-[#5C2E00]"><strong>Lacunes :</strong> {rotation.lacune}</p>
          <ConfianceBreakdown confiance={rotation.confiance} />
        </Repli>
      </div>

      <p className="m-0 rounded-[20px] bg-ink p-5 text-base text-paper">Validez avec un conseiller agricole avant de vous lancer : ForoSat aide à décider, il ne décide pas à votre place.</p>
    </>
  );
}
