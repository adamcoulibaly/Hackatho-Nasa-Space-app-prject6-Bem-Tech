import type { Climat } from "@/lib/contract";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const SOL = "#8A5A2B";
const PLANTE = "#2F8F3A";
const PAILLE = "#D9B26A";
const EAU = "#3B82C4";

/** Pluie (gouttes) au-dessus d'une parcelle. */
const Gouttes = () => (
  <g fill={EAU}>
    {[30, 70, 110, 150, 190, 230].map((x, i) => <path key={x} d={`M${x} ${14 + (i % 2) * 10}q-4 8 0 10q4 -2 0 -10z`} />)}
  </g>
);
const Soleil = () => (
  <g>
    <circle cx="240" cy="26" r="14" fill="#F7A600" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <line key={a} x1="240" y1="26" x2={240 + 22 * Math.cos((a * Math.PI) / 180)} y2={26 + 22 * Math.sin((a * Math.PI) / 180)} stroke="#F7A600" strokeWidth="2" />
    ))}
  </g>
);

const DESSINS = {
  pluieNu: (
    <svg viewBox="0 0 270 110" role="img" aria-label="Forte pluie sur un sol nu : l'eau ruisselle et emporte la terre">
      <rect width="270" height="110" rx="14" fill="#E8F1F7" />
      <Gouttes />
      <path d="M0 70 L270 92 V110 H0z" fill={SOL} />
      <path d="M40 74q30 6 60 10t70 8" stroke={EAU} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M200 96l20 4l-6 6z" fill="#B5793F" />
      <path d="M215 99l18 3" stroke="#B5793F" strokeWidth="3" />
    </svg>
  ),
  pluieCouvert: (
    <svg viewBox="0 0 270 110" role="img" aria-label="Pluie sur un sol couvert : l'eau s'infiltre et reste pour les racines">
      <rect width="270" height="110" rx="14" fill="#E8F1F7" />
      <Gouttes />
      <rect y="72" width="270" height="38" fill={SOL} />
      {[25, 65, 105, 145, 185, 225].map((x) => <path key={x} d={`M${x} 72v-22m0 8q-9 -4 -12 -12m12 16q9 -4 12 -12`} stroke={PLANTE} strokeWidth="3" fill="none" strokeLinecap="round" />)}
      {[40, 120, 200].map((x) => <path key={x} d={`M${x} 80v20`} stroke={EAU} strokeWidth="3" strokeDasharray="3 4" />)}
    </svg>
  ),
  chaleurNu: (
    <svg viewBox="0 0 270 110" role="img" aria-label="Forte chaleur sur un sol nu : une croûte se forme, le sol se fend et sèche">
      <rect width="270" height="110" rx="14" fill="#FBE9D0" />
      <Soleil />
      <rect y="72" width="270" height="38" fill="#B98A57" />
      <path d="M30 72l10 14l-6 10M110 72l-8 16l10 12M190 72l12 12l-4 14" stroke="#6E4520" strokeWidth="2.5" fill="none" />
      {[60, 140, 220].map((x) => <path key={x} d={`M${x} 64q4 -8 0 -16q-4 -8 0 -16`} stroke="#C2410C" strokeWidth="2" fill="none" opacity="0.6" />)}
    </svg>
  ),
  chaleurPaille: (
    <svg viewBox="0 0 270 110" role="img" aria-label="Forte chaleur sur un sol paillé : le sol reste plus frais et garde son humidité">
      <rect width="270" height="110" rx="14" fill="#FBE9D0" />
      <Soleil />
      <rect y="76" width="270" height="34" fill={SOL} />
      {Array.from({ length: 18 }, (_, i) => <path key={i} d={`M${8 + i * 15} 76l12 -5`} stroke={PAILLE} strokeWidth="4" strokeLinecap="round" />)}
      {[45, 135, 225].map((x) => <path key={x} d={`M${x} 71v-26m0 10q-9 -4 -12 -12m12 16q9 -4 12 -12`} stroke={PLANTE} strokeWidth="3" fill="none" strokeLinecap="round" />)}
      {[80, 180].map((x) => <circle key={x} cx={x} cy="94" r="4" fill={EAU} />)}
    </svg>
  ),
};

/** Ce que la pluie et la chaleur font concrètement au sol, illustré et rattaché aux chiffres NASA de la région. */
export function EffetsSurLeSol({ climat }: { climat: Climat }) {
  const iPluie = climat.pluieMensuelle.indexOf(Math.max(...climat.pluieMensuelle));
  const chaleur = climat.onglets.find((o) => o.id === "chaleur")?.valeurs;
  const iChaud = chaleur ? chaleur.indexOf(Math.max(...chaleur)) : -1;
  const cartes = [
    { dessin: DESSINS.pluieNu, titre: "Forte pluie, sol nu", texte: "L'eau ruisselle au lieu d'entrer : elle emporte la terre fertile de surface (érosion) et creuse des rigoles." },
    { dessin: DESSINS.pluieCouvert, titre: "Pluie, sol couvert", texte: "Les plantes et leurs racines freinent l'eau : elle s'infiltre et reste dans le sol pour les semaines sèches." },
    { dessin: DESSINS.chaleurNu, titre: "Forte chaleur, sol nu", texte: "La surface dépasse souvent 45 °C : une croûte dure se forme, le sol se fend, l'eau s'évapore et la matière organique se dégrade." },
    { dessin: DESSINS.chaleurPaille, titre: "Forte chaleur, sol paillé", texte: "Le paillage (résidus de récolte, herbes) fait de l'ombre au sol : il reste plus frais, garde son humidité et sa vie." },
  ];
  return (
    <section className="flex flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-[26px]">
      <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">Ce que la pluie et la chaleur font à votre sol</h2>
      <p className="m-0 text-[15px] leading-normal text-muted">
        {`Dans votre région, c'est en ${MOIS[iPluie]} qu'il pleut le plus (${climat.pluieMensuelle[iPluie]} mm en moyenne)`}
        {chaleur && iChaud >= 0 ? `, et en ${MOIS[iChaud]} qu'il fait le plus chaud (${chaleur[iChaud]} °C de maximum moyen dans l'air).` : "."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {cartes.map((c) => (
          <figure key={c.titre} className="m-0 flex flex-col gap-2 rounded-2xl bg-paper p-3">
            {c.dessin}
            <figcaption className="flex flex-col gap-1">
              <strong className="text-[15px]">{c.titre}</strong>
              <span className="text-sm leading-normal">{c.texte}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="m-0 text-xs text-muted">Dessins explicatifs. Chiffres : NASA POWER, 2005–2025, au chef-lieu de la région.</p>
    </section>
  );
}
