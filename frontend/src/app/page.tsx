import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { LogoAnime } from "@/components/LogoAnime";
import { EcranAccueil } from "@/components/EcranAccueil";
import { LancerGuide } from "@/components/LancerGuide";

const CTA = "inline-flex h-14 items-center rounded-full px-6 text-[17px] font-bold no-underline";

const PROBLEMES = [
  ["Eau", "Une culture trop gourmande pendant une saison sèche, et c'est toute la récolte qui souffre."],
  ["Sol", "Les mêmes cultures année après année épuisent le sol et favorisent les ravageurs."],
  ["Climat", "Les saisons changent. Ce qui marchait pour nos parents ne suffit plus toujours."],
];
const PUBLICS = [
  ["L'agriculteur", "Petit ou moyen producteur. Il reçoit une fiche simple sur WhatsApp ou imprimée : quoi semer, quand, et pourquoi."],
  ["Le conseiller agricole", "Il analyse les parcelles des agriculteurs qu'il accompagne, compare les rotations avec eux et leur envoie la fiche."],
  ["La coopérative", "Elle voit les risques de chaque région et partage les fiches de ses membres ; un espace pour suivre toutes leurs parcelles est en préparation."],
];
const ETAPES = [
  ["01", "Je situe mon champ", "Sur la carte, j'indique ma parcelle, mes cultures actuelles et ce qui compte pour moi."],
  ["02", "Les satellites parlent", "Vingt ans d'observations NASA sur ma région. Des règles et des statistiques y repèrent la saison des pluies, les poches sèches et les années de stress."],
  ["03", "Je compare 3 rotations", "Ma rotation actuelle face à deux alternatives, rejouées sur 21 saisons réelles et projetées vers 2050, avec leurs bénéfices, leurs risques et leur niveau de confiance."],
];
const EXISTANT = [
  ["Suivi de parcelles", "OneSoil, Climate FieldView", "Pensés pour de grandes exploitations mécanisées. Montrent l'état du champ, pas quoi semer ensuite."],
  ["Plateformes de données", "Digital Earth Africa, WaPOR", "Ouvertes et fiables, mais sans interface ni conseil pour l'agriculteur."],
  ["Conseil par téléphone", "iska, Darli AI", "Très bon canal, mais météo à court terme ou questions-réponses, sans analyse de la parcelle."],
  ["Bulletins agrométéo", "FAO, SODEXAM", "Adaptés au pays, mais régionaux, limités à trois cultures et non personnalisés."],
];

/** Trois espaces, comme le menu : décider, suivre sa saison, comprendre. */
const ESPACES: { titre: string; sous: string; outils: [string, string, string][] }[] = [
  {
    titre: "Décider",
    sous: "Choisir sa rotation",
    outils: [
      ["Rotations comparées", "/rotations", "Trois rotations notées, rejouées sur les saisons réelles et projetées en 2050, avec l'assistant pour les comparer."],
      ["Simulateur", "/simulateur", "Les rotations sur 3, 5 ou 10 ans, en année sèche ou très pluvieuse."],
      ["Rentabilité", "/rotations", "Recettes et marges avec mes propres prix du marché."],
    ],
  },
  {
    titre: "Suivre ma saison",
    sous: "Au jour le jour",
    outils: [
      ["Alertes du jour", "/tableau", "Semis, sécheresse, fortes pluies et chaleur, avec un conseil ; en notification dans l'app."],
      ["Calendrier agricole", "/calendrier", "Préparation, semis, entretien, récolte : les dates de ma culture."],
      ["Carnet de suivi", "/suivi", "Ce que je vois au champ, et prévenir mes voisins sur WhatsApp."],
    ],
  },
  {
    titre: "Comprendre",
    sous: "Les données NASA",
    outils: [
      ["Climat de ma zone", "/climat", "Pluie, chaleur, humidité du sol et végétation mesurées depuis 2005."],
      ["Carte des risques", "/risques", "Les 33 régions de Côte d'Ivoire : saisons perdues depuis 2005 et estimation vers 2050."],
      ["Traduire ForoSat", "/traduire", "Dioula, baoulé, sénoufo : traduit avec les locuteurs."],
    ],
  },
];

export default function Home() {
  return (
    <>
      <EcranAccueil />
      <SiteHeader />
      <main>
        <section data-stagger className="relative mx-auto flex min-h-[calc(100svh-162px)] max-w-[1360px] md:min-h-[calc(100svh-68px)] flex-col items-start justify-center gap-6 px-6 py-14">
          <div aria-hidden="true" className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 rounded-full bg-ink p-10 shadow-[0_30px_80px_rgba(7,18,13,0.25)] xl:block">
            <LogoAnime size={280} />
          </div>
          <span className="rounded-full border border-line px-3.5 py-2 text-sm text-muted">NASA Space Apps 2026 · Défi 6</span>
          <h1 className="m-0 max-w-4xl font-display text-[clamp(40px,6vw,84px)] font-bold leading-none tracking-[-0.05em]">
            Lire le ciel pour mieux <span className="font-serif font-normal italic text-orange-dark">cultiver</span> la terre.
          </h1>
          <p className="m-0 max-w-2xl text-lg leading-relaxed text-muted">
            ForoSat aide l'agriculteur et son conseiller agricole à choisir la prochaine rotation de cultures : la rotation actuelle comparée à deux alternatives, à partir de l'historique climatique observé par la NASA, avec le pourquoi de chaque conseil. Partout dans le monde : 19 cultures, proposées selon le pays de la parcelle.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/parcelle" className={`${CTA} bg-orange text-ink hover:text-ink`}>Analyser ma parcelle</Link>
            <a href="#comment" className={`${CTA} border border-ink text-ink hover:text-ink`}>Voir comment ça marche</a>
          </div>
        </section>

        <section className="bg-ink text-paper">
          <div className="mx-auto flex max-w-[1360px] flex-col gap-8 px-6 py-16">
            <h2 className="m-0 max-w-3xl font-display text-[clamp(26px,3.4vw,44px)] font-bold leading-tight tracking-[-0.04em]">
              Pluies irrégulières, sols qui s'appauvrissent, chaleur qui monte. Chaque saison, nos agriculteurs <span className="font-serif font-normal italic text-orange">décident à l'aveugle</span> de ce qu'ils vont semer.
            </h2>
            <ul data-stagger className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 p-0">
              {PROBLEMES.map(([t, d]) => (
                <li key={t} className="lift flex flex-col gap-2 rounded-3xl bg-[#13261C] p-6">
                  <h3 className="m-0 font-display text-xl font-bold text-orange">{t}</h3>
                  <p className="m-0 text-base leading-normal text-[#C9D4CD]">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto flex max-w-[1360px] flex-col gap-8 px-6 py-16">
          <h2 className="m-0 max-w-3xl font-display text-[clamp(26px,3.4vw,44px)] font-bold leading-tight tracking-[-0.04em]">
            Les données existent. Les canaux aussi. <span className="font-serif font-normal italic text-green-dark">Il manquait le chaînon.</span>
          </h2>
          <p className="m-0 max-w-2xl text-base leading-relaxed text-muted">On ne refait pas ce qui existe. ForoSat ajoute la décision de rotation entre les données ouvertes et les canaux que les agriculteurs utilisent déjà.</p>
          <div data-stagger className="grid gap-4 lg:grid-cols-3">
            <div className="lift rounded-3xl bg-white p-6"><span className="text-sm text-muted">En amont · les données</span><h3 className="mb-2 mt-1 font-display text-lg font-bold">Satellites et plateformes ouvertes</h3><p className="m-0 text-[15px] leading-normal text-muted">NASA POWER, SMAP, MODIS, Digital Earth Africa, WaPOR. De qualité et gratuites, mais brutes : il faut des compétences SIG pour les lire.</p></div>
            <div className="lift rounded-3xl bg-ink p-6 text-paper"><span className="text-sm text-[#9DB0A5]">Au centre · ForoSat</span><h3 className="mb-2 mt-1 font-display text-lg font-bold text-orange">La décision de rotation, parcelle par parcelle</h3><p className="m-0 text-[15px] leading-normal text-[#C9D4CD]">Rotation actuelle contre deux alternatives, notées sur sept critères, avec le pourquoi et un niveau de confiance.</p></div>
            <div className="lift rounded-3xl bg-white p-6"><span className="text-sm text-muted">En aval · les canaux</span><h3 className="mb-2 mt-1 font-display text-lg font-bold">Là où sont déjà les agriculteurs</h3><p className="m-0 text-[15px] leading-normal text-muted">WhatsApp, fiche imprimée, conseillers agricoles, coopératives. Un conseil qui arrive même chez l'agriculteur sans smartphone.</p></div>
          </div>
          <h3 className="m-0 mt-4 font-display text-xl font-bold">Ce qui existe déjà, et ce qui manque ici</h3>
          <ul data-stagger className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5 p-0">
            {EXISTANT.map(([t, ex, d]) => (
              <li key={t} className="lift flex flex-col gap-1.5 rounded-3xl bg-white p-5">
                <strong className="font-display text-base">{t}</strong>
                <span className="text-sm text-muted">{ex}</span>
                <p className="m-0 text-[15px] leading-normal">{d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white">
          <div className="mx-auto flex max-w-[1360px] flex-col gap-6 px-6 py-16">
            <h2 className="m-0 font-display text-[clamp(26px,3.4vw,44px)] font-bold tracking-[-0.04em]">Pour qui ?</h2>
            <ul data-stagger className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 p-0">
              {PUBLICS.map(([t, d]) => (
                <li key={t} className="lift flex flex-col gap-2 rounded-3xl bg-paper p-6"><h3 className="m-0 font-display text-lg font-bold">{t}</h3><p className="m-0 text-base leading-normal text-muted">{d}</p></li>
              ))}
            </ul>
          </div>
        </section>

        <section id="comment" className="mx-auto flex max-w-[1360px] scroll-mt-4 flex-col gap-6 px-6 py-16">
          <h2 className="m-0 font-display text-[clamp(26px,3.4vw,44px)] font-bold leading-tight tracking-[-0.04em]">Trois étapes, <span className="font-serif font-normal italic text-orange-dark">une décision éclairée.</span></h2>
          <p className="m-0 max-w-2xl text-base text-muted">Pas besoin d'être expert. ForoSat traduit les données satellites en conseils simples, avec le pourquoi de chaque recommandation.</p>
          <ol data-stagger className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 p-0">
            {ETAPES.map(([n, t, d]) => (
              <li key={n} className="lift flex flex-col gap-2 rounded-3xl bg-white p-6"><span className="font-display text-sm font-bold text-orange-dark">{n}</span><h3 className="m-0 font-display text-lg font-bold">{t}</h3><p className="m-0 text-base leading-normal text-muted">{d}</p></li>
            ))}
          </ol>
          <h3 className="m-0 mt-4 font-display text-xl font-bold">Trois espaces, un seul outil</h3>
          <div data-stagger className="grid gap-4 md:grid-cols-3">
            {ESPACES.map((e) => (
              <section key={e.titre} aria-label={e.titre} className="lift flex flex-col gap-3 rounded-3xl bg-white p-5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-dark">{e.sous}</span>
                  <h4 className="m-0 font-display text-xl font-bold">{e.titre}</h4>
                </div>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {e.outils.map(([nom, href, d]) => (
                    <li key={nom} className="flex flex-col gap-0.5 border-t border-line pt-2.5">
                      <Link href={href} className="text-[16px] font-bold no-underline">{`${nom} →`}</Link>
                      <span className="text-sm leading-normal text-muted">{d}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="m-0 text-[15px] text-muted">Les pages déjà consultées restent disponibles hors connexion, sur le site comme dans l&apos;app Android.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/bienvenue" className={`${CTA} bg-orange text-ink hover:text-ink`}>Commencer</Link>
            <LancerGuide className={`${CTA} border border-ink text-ink`}>Guide pas à pas</LancerGuide>
            <Link href="/guide" className={`${CTA} border border-ink text-ink hover:text-ink`}>Guide d&apos;utilisation</Link>
            <Link href="/methode" className={`${CTA} border border-ink text-ink hover:text-ink`}>Méthode et incertitude</Link>
          </div>
        </section>
      </main>
      <footer data-reveal className="bg-ink text-paper">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-6 py-8 text-sm text-[#C9D4CD]">
          <span>Outil d'aide à la décision : il ne remplace ni l'agriculteur ni le conseiller agricole.</span>
          <span>Projet réalisé pour le NASA Space Apps Challenge 2026.</span>
        </div>
      </footer>
    </>
  );
}
