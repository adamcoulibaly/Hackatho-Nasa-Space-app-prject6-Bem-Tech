import Link from "next/link";

export const ETAPES_GUIDE = [
  { titre: "Situez votre champ", texte: "Cherchez votre village ou utilisez votre position, puis dessinez le contour de votre champ sur la carte. Choisissez vos cultures, votre accès à l'eau et ce qui compte pour vous.", action: "Aller au champ", href: "/parcelle" },
  { titre: "Lisez le climat de votre zone", texte: "Pluie, chaleur, humidité du sol et végétation mesurées par la NASA depuis 2005, et ce qu'elles font concrètement à votre sol.", action: "Voir le climat", href: "/climat" },
  { titre: "Comparez trois rotations", texte: "Votre rotation actuelle et deux alternatives, notées sur 7 critères, rejouées sur 21 saisons réelles et projetées vers 2030, 2040 et 2050.", action: "Comparer", href: "/rotations" },
  { titre: "Simulez avant de choisir", texte: "Sur 3, 5 ou 10 ans, en année sèche ou très pluvieuse : voyez le rendement, la fertilité et la couverture du sol évoluer.", action: "Simuler", href: "/simulateur" },
  { titre: "Suivez la saison", texte: "L'accueil montre chaque jour l'état de semis et les alertes (sécheresse, fortes pluies) avec un conseil. Dans l'app, activez les notifications.", action: "Ouvrir l'accueil", href: "/tableau" },
  { titre: "Suivez votre calendrier", texte: "Les étapes de votre culture, de la préparation du sol à l'après-récolte, datées selon votre région et votre date de semis.", action: "Ouvrir le calendrier", href: "/calendrier" },
  { titre: "Notez ce que vous voyez", texte: "Le carnet de suivi garde vos observations sur le téléphone et les compare aux prévisions de ForoSat.", action: "Ouvrir le carnet", href: "/suivi" },
  { titre: "Partagez la fiche", texte: "Envoyez la fiche de votre rotation par WhatsApp, ou écoutez-la à voix haute.", action: "Voir une fiche", href: "/fiche/B" },
] as const;

/** Guide d'utilisation : les étapes de ForoSat, chacune avec un lien pour essayer. */
export function GuideEtapes() {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {ETAPES_GUIDE.map((e, i) => (
        <li key={e.titre} className="flex gap-4 rounded-[24px] bg-white p-5">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange font-display text-lg font-bold text-ink">{i + 1}</span>
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="m-0 font-display text-lg font-bold tracking-[-0.02em]">{e.titre}</h2>
            <p className="m-0 text-[15px] leading-normal text-muted">{e.texte}</p>
            <Link href={e.href} className="inline-flex min-h-11 items-center self-start text-[15px] font-bold">{`${e.action} →`}</Link>
          </div>
        </li>
      ))}
    </ol>
  );
}
