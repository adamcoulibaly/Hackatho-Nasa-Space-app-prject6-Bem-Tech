import Link from "next/link";
import { ParcelleHeader } from "@/components/ParcelleHeader";
import { RequireParcelle } from "@/components/RequireParcelle";
import { RainChart } from "@/components/RainChart";
import { YearMatrix } from "@/components/YearMatrix";
import { GraceChart } from "@/components/GraceChart";
import { AlertCard } from "@/components/AlertCard";
import { getClimat } from "@/lib/data";

export const metadata = { title: "Profil climatique — ForoSat" };

const Card = ({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-4 rounded-[28px] bg-white p-[26px]">
    <div className="flex flex-wrap items-baseline justify-between gap-2.5">
      <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">{titre}</h2>
      {aide && <span className="text-sm text-muted">{aide}</span>}
    </div>
    {children}
  </section>
);

export default async function ClimatPage() {
  const climat = await getClimat();
  return (
    <>
      <ParcelleHeader current="climat" />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-[22px] px-6 pb-14 pt-8">
        <RequireParcelle>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[13px] uppercase tracking-[0.14em] text-muted">Étape 2 sur 3 · valeurs d'exemple</span>
              <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">
                Le climat de votre champ, <span className="font-serif font-normal italic text-green-dark">vu de l'espace.</span>
              </h1>
            </div>
            <Link href="/rotations" className="inline-flex h-[52px] items-center rounded-full bg-orange px-6 text-base font-bold text-ink no-underline hover:text-ink">Voir les 3 rotations</Link>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5">
            {climat.indicateurs.map((k, i) => (
              <div key={k.label} className={`flex flex-col gap-2.5 rounded-3xl p-[22px] ${i === 0 ? "bg-ink text-paper" : "bg-white"}`}>
                <span className={`text-sm ${i === 0 ? "text-[#9DB0A5]" : "text-muted"}`}>{k.label}</span>
                <span className={`font-display text-[30px] font-bold tracking-[-0.03em] ${k.accent ? "text-orange-dark" : ""}`}>{k.valeur}</span>
                <span className={`text-[13px] ${i === 0 ? "text-[#9DB0A5]" : "text-muted"}`}>{k.source}</span>
              </div>
            ))}
          </div>

          <Card titre="Pluie mois par mois" aide="Moyenne en mm · la bande claire marque la saison des pluies">
            <RainChart mois={climat.pluieMensuelle} saison={climat.saisonPluies} />
          </Card>
          <Card titre="L'année d'un coup d'œil" aide="Plus la case est foncée, plus la valeur est élevée">
            <YearMatrix lignes={climat.matrice} />
          </Card>
          <Card titre="L'eau stockée dans la zone, sur 20 ans">
            <GraceChart data={climat.grace} />
            <p className="m-0 text-[15px] leading-normal text-muted">
              Écart à la moyenne de la réserve d'eau totale (GRACE puis GRACE-FO, valeurs d'exemple). La réserve baisse depuis une dizaine d'années. Les colonnes hachurées marquent une <strong className="text-ink">lacune de données</strong> : la fin de GRACE en 2017 et le lancement de GRACE-FO en 2018. Mesure à grande échelle (plusieurs centaines de km) : elle décrit la région, pas la parcelle.
            </p>
          </Card>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
            {climat.alertes.map((a) => <AlertCard key={a.titre} alerte={a} />)}
          </div>
        </RequireParcelle>
      </main>
    </>
  );
}
