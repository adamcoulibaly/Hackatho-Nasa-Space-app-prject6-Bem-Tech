import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Espace conseiller — ForoSat" };

const LIGNES = [
  { nom: "Koffi [exemple]", village: "Korhogo", actuelle: "Maïs → Coton", conseillee: "Maïs → Arachide → Coton", confiance: "Moyenne" },
  { nom: "Awa [exemple]", village: "Karakoro", actuelle: "Maïs → Maïs", conseillee: "Sorgho → Niébé → Maïs", confiance: "Moyenne" },
  { nom: "Seydou [exemple]", village: "Napié", actuelle: "Coton → Maïs", conseillee: "Coton → Arachide → Maïs", confiance: "Élevée" },
  { nom: "Mariam [exemple]", village: "Korhogo", actuelle: "Igname → Maïs", conseillee: "Igname → Niébé → Maïs", confiance: "Faible" },
];

export default function ConseillerPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-6 px-6 pb-14 pt-8">
        <p role="note" className="m-0 self-start rounded-full bg-[#FDE7CC] px-4 py-2 text-sm font-bold text-[#5C2E00]">Vision · après le hackathon · valeurs d'exemple</p>
        <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">
          Vos agriculteurs, <span className="font-serif font-normal italic text-green-dark">parcelle par parcelle.</span>
        </h1>
        <p className="m-0 max-w-2xl text-base leading-relaxed text-muted">Beaucoup d'agriculteurs n'ont pas de smartphone. Le conseiller fait l'analyse avec eux et leur transmet la fiche. Cet écran montre l'idée ; il n'est pas encore fonctionnel.</p>
        <div className="overflow-x-auto rounded-3xl bg-white p-2">
          <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
            <caption className="sr-only">Rotations conseillées par agriculteur (exemple)</caption>
            <thead>
              <tr className="text-sm text-muted">
                {["Agriculteur", "Village", "Actuelle", "Conseillée", "Confiance"].map((h) => <th key={h} scope="col" className="p-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody data-stagger>
              {LIGNES.map((l) => (
                <tr key={l.nom} className="border-t border-[#E3E8E2]">
                  <th scope="row" className="p-3 font-bold">{l.nom}</th>
                  <td className="p-3">{l.village}</td>
                  <td className="p-3">{l.actuelle}</td>
                  <td className="p-3">{l.conseillee}</td>
                  <td className="p-3">{l.confiance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
