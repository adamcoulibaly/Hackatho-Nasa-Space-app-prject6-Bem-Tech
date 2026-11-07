import { SiteHeader } from "@/components/SiteHeader";
import { ApproachPicker } from "@/components/ApproachPicker";
import { ConfianceBreakdown } from "@/components/ConfianceBreakdown";
import { getRotations, getSources } from "@/lib/data";

export const metadata = { title: "Méthode et incertitude — ForoSat" };

const FINESSE = { fine: "bg-[#D7F0E2] text-[#00502B]", moyenne: "bg-[#FDE7CC] text-[#7A3D00]", grossiere: "bg-[#E7ECE6] text-ink" };

export default async function MethodePage() {
  const [src, rotations] = await Promise.all([getSources(), getRotations()]);
  const exemple = rotations.find((r) => r.recommandee) ?? rotations[0];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-8 px-6 pb-14 pt-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">
            Comment ForoSat raisonne, <span className="font-serif font-normal italic text-orange-dark">et où il peut se tromper.</span>
          </h1>
          <p className="m-0 text-lg leading-relaxed text-muted">L'IA détecte les tendances dans les données. Des règles agronomiques transparentes font la recommandation. L'agriculteur et son conseiller décident.</p>
        </div>

        <ol data-stagger className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5 p-0">
          {src.etapes.map((e, i) => (
            <li key={e.titre} className={`lift flex flex-col gap-2 rounded-3xl p-5 ${i === 2 ? "bg-ink text-paper" : "bg-white"}`}>
              <span className={`font-display text-sm font-bold ${i === 2 ? "text-orange" : "text-orange-dark"}`}>{String(i + 1).padStart(2, "0")}</span>
              <h2 className="m-0 font-display text-base font-bold">{e.titre}</h2>
              <p className={`m-0 text-sm leading-normal ${i === 2 ? "text-[#C9D4CD]" : "text-muted"}`}>{e.texte}</p>
            </li>
          ))}
        </ol>

        <section className="flex flex-col gap-4">
          <h2 className="m-0 font-display text-2xl font-bold tracking-[-0.02em]">Quatre approches comparées</h2>
          <ApproachPicker approches={src.approches} />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="m-0 font-display text-2xl font-bold tracking-[-0.02em]">Les données, ramenées sur une même grille</h2>
            <p className="m-0 mt-2 text-base text-muted">Chaque source est agrégée au mois et rééchantillonnée sur la grille de la zone pilote. Résolutions données en ordres de grandeur.</p>
          </div>
          <div className="overflow-x-auto rounded-3xl bg-white p-2">
            <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="text-sm text-muted">
                  <th scope="col" className="p-3 font-semibold">Source</th>
                  <th scope="col" className="p-3 font-semibold">Ce qu'elle mesure</th>
                  <th scope="col" className="p-3 font-semibold">Finesse</th>
                  <th scope="col" className="p-3 font-semibold">Usage dans ForoSat</th>
                  <th scope="col" className="p-3 font-semibold">Priorité</th>
                </tr>
              </thead>
              <tbody data-stagger>
                {src.sources.map((s) => (
                  <tr key={s.nom} className="border-t border-[#E3E8E2]">
                    <th scope="row" className="p-3 font-bold">{s.nom}</th>
                    <td className="p-3">{s.mesure}</td>
                    <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${FINESSE[s.finesseClasse]}`}>{s.finesse}</span></td>
                    <td className="p-3">{s.usage}</td>
                    <td className="p-3">{s.priorite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div data-stagger className="grid gap-5 lg:grid-cols-2">
          <section className="flex flex-col gap-4 rounded-[28px] bg-white p-[26px]">
            <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">Confiance : exemple de la rotation {exemple.id}</h2>
            <ConfianceBreakdown confiance={exemple.confiance} />
          </section>
          <section className="flex flex-col gap-4 rounded-[28px] bg-ink p-[26px] text-paper">
            <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">Là où l'humain décide</h2>
            <ul className="m-0 flex flex-col gap-2 pl-5 text-base leading-normal">
              {src.humainDecide.map((h) => <li key={h}>{h}</li>)}
            </ul>
            <p className="m-0 rounded-2xl bg-[#13261C] p-4 text-sm leading-normal text-[#C9D4CD]">
              Adapté au contexte ivoirien : le défi parle de gel, il n'y en a pas ici. ForoSat le remplace par le stress de chaleur et l'harmattan.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
