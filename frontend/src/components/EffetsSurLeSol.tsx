import type { Climat } from "@/lib/contract";
import { PlanteCulture, TEINTES_SAINES } from "./plantes";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const EAU = "#2F7DBF";

/** Fond commun des scènes : ciel en dégradé, collines au loin. */
function Decor({ id, chaud }: { id: string; chaud: boolean }) {
  const ciel = chaud ? ["#F7D9A6", "#FCF1DF"] : ["#9CC7E3", "#E3F0F8"];
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ciel[0]} />
          <stop offset="1" stopColor={ciel[1]} />
        </linearGradient>
      </defs>
      <rect width="300" height="160" fill={`url(#${id})`} />
      <path d="M0 84 Q70 70 150 80 T300 76 V160 H0Z" fill={chaud ? "#D8B27A" : "#8DB97A"} opacity="0.5" />
    </>
  );
}

const Pluie = () => (
  <g>
    <path d="M24 30 a12 12 0 0 1 22 -8 a15 15 0 0 1 28 5 a10 10 0 0 1 0 20 h-46 a10 10 0 0 1 -4 -17z" fill="#7C93A6" />
    <path d="M168 24 a12 12 0 0 1 22 -8 a15 15 0 0 1 28 5 a10 10 0 0 1 0 20 h-46 a10 10 0 0 1 -4 -17z" fill="#8FA4B5" />
    <g stroke={EAU} strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
      {[30, 52, 74, 96, 176, 198, 220, 242, 120, 140, 262].map((x, i) => (
        <path key={x} d={`M${x} ${52 + (i % 3) * 8} l-4 10`} />
      ))}
    </g>
  </g>
);

function Soleil({ fort = true }: { fort?: boolean }) {
  const id = fort ? "halo-fort" : "halo-doux";
  return (
    <g>
      <defs>
        <radialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F7A600" stopOpacity={fort ? 0.6 : 0.4} />
          <stop offset="1" stopColor="#F7A600" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="262" cy="30" r={fort ? 34 : 26} fill={`url(#${id})`} />
      <circle cx="262" cy="30" r={fort ? 13 : 10} fill="#F7A600" />
    </g>
  );
}

/** Une rangée de plantes sur la ligne de sol `y`. */
const Plantes = ({ y, xs, k = 0.8 }: { y: number; xs: number[]; k?: number }) => (
  <g>
    {xs.map((x) => (
      <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
        <PlanteCulture culture="Maïs" stade="croissance" t={TEINTES_SAINES} />
      </g>
    ))}
  </g>
);

const DESSINS = {
  pluieNu: (
    <svg viewBox="0 0 300 160" role="img" aria-label="Forte pluie sur un sol nu : l'eau ruisselle et emporte la terre" className="block h-auto w-full">
      <Decor id="ciel-pluie-nu" chaud={false} />
      <Pluie />
      <path d="M0 96 L300 122 V160 H0Z" fill="#8A5A2B" />
      <path d="M0 96 L300 122" stroke="#6E4520" strokeWidth="2" />
      {/* Rigoles et terre emportée vers le bas de la pente */}
      <path d="M20 102 q50 6 100 10 t110 12 q30 2 60 6" stroke={EAU} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M60 112 q40 6 90 10 t100 10" stroke={EAU} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      <g fill="#B5793F">
        {[[232, 128], [248, 131], [262, 134], [276, 136], [254, 140], [270, 143]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="4" ry="2.5" />)}
      </g>
      <path d="M276 128 l16 4 l-8 6" stroke="#5C2E00" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  pluieCouvert: (
    <svg viewBox="0 0 300 160" role="img" aria-label="Pluie sur un sol couvert : l'eau s'infiltre et reste pour les racines" className="block h-auto w-full">
      <Decor id="ciel-pluie-couvert" chaud={false} />
      <Pluie />
      <rect y="104" width="300" height="56" fill="#7A4E26" />
      <path d="M0 104 Q150 96 300 104 V112 Q150 104 0 112Z" fill="#68411F" />
      <Plantes y={106} xs={[30, 90, 150, 210, 270]} />
      {/* Racines et eau qui s'infiltre */}
      <g stroke="#C9A06B" strokeWidth="1.4" fill="none" opacity="0.9">
        {[30, 90, 150, 210, 270].map((x) => <path key={x} d={`M${x} 108 q-6 10 -4 20 M${x} 108 q6 12 3 22`} />)}
      </g>
      <g fill={EAU}>
        {[60, 120, 180, 240].map((x, i) => <path key={x} d={`M${x} ${118 + (i % 2) * 10} q-3 6 0 8 q3 -2 0 -8z`} />)}
        {[60, 120, 180, 240].map((x, i) => <path key={`b${x}`} d={`M${x} ${136 + (i % 2) * 6} q-3 6 0 8 q3 -2 0 -8z`} opacity="0.6" />)}
      </g>
    </svg>
  ),
  chaleurNu: (
    <svg viewBox="0 0 300 160" role="img" aria-label="Forte chaleur sur un sol nu : une croûte se forme, le sol se fend et sèche" className="block h-auto w-full">
      <Decor id="ciel-chaleur-nu" chaud />
      <Soleil />
      {[70, 150, 210].map((x) => <path key={x} d={`M${x} 92 q5 -8 0 -16 q-5 -8 0 -16`} stroke="#C2410C" strokeWidth="2" fill="none" opacity="0.5" />)}
      <rect y="100" width="300" height="60" fill="#B98A57" />
      <rect y="100" width="300" height="7" fill="#9C6F42" />
      <g stroke="#5E3A1A" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M30 100 l8 14 l-6 12 l8 12" />
        <path d="M105 100 l-6 16 l9 10 l-4 14" />
        <path d="M180 100 l10 12 l-5 14" />
        <path d="M250 100 l-8 15 l6 12" />
      </g>
      <text x="20" y="150" fontSize="11" fontWeight="700" fill="#5C2E00">45 °C+</text>
    </svg>
  ),
  chaleurPaille: (
    <svg viewBox="0 0 300 160" role="img" aria-label="Forte chaleur sur un sol paillé : le sol reste plus frais et garde son humidité" className="block h-auto w-full">
      <Decor id="ciel-chaleur-paille" chaud />
      <Soleil fort={false} />
      <rect y="106" width="300" height="54" fill="#7A4E26" />
      <Plantes y={104} xs={[40, 125, 210]} k={0.75} />
      {/* Couche de paille */}
      <g stroke="#D9B26A" strokeWidth="3.4" strokeLinecap="round">
        {Array.from({ length: 26 }, (_, i) => <path key={i} d={`M${4 + i * 11.5} ${106 - (i % 2) * 2} l10 ${i % 3 === 0 ? -4 : -2}`} />)}
      </g>
      <g stroke="#C49A52" strokeWidth="2.4" strokeLinecap="round">
        {Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${10 + i * 23} 108 l9 -3`} />)}
      </g>
      <g fill={EAU} opacity="0.85">
        {[[40, 128], [100, 138], [170, 126], [230, 140], [280, 130]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.6" />)}
      </g>
    </svg>
  ),
};

function Etiquette({ bon }: { bon: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-xs font-bold ${bon ? "bg-[#D9F2E6] text-green-dark" : "bg-[#FBD3C4] text-[#7A1F00]"}`}>
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {bon ? <path d="M2.5 6.5l2.5 2.5l4.5 -6" /> : <path d="M3 3l6 6M9 3l-6 6" />}
      </svg>
      {bon ? "À faire" : "À éviter"}
    </span>
  );
}

function Carte({ dessin, titre, texte, bon }: { dessin: React.ReactNode; titre: string; texte: string; bon: boolean }) {
  return (
    <figure className={`m-0 flex flex-col overflow-hidden rounded-[22px] border-2 bg-white ${bon ? "border-[#9ED4B6]" : "border-[#F2B9A2]"}`}>
      {dessin}
      <figcaption className="flex flex-col gap-1.5 p-4">
        <Etiquette bon={bon} />
        <strong className="text-[16px]">{titre}</strong>
        <span className="text-sm leading-normal text-muted">{texte}</span>
      </figcaption>
    </figure>
  );
}

/** Ce que la pluie et la chaleur font concrètement au sol, illustré et rattaché aux chiffres NASA de la région. */
export function EffetsSurLeSol({ climat }: { climat: Climat }) {
  const iPluie = climat.pluieMensuelle.indexOf(Math.max(...climat.pluieMensuelle));
  const chaleur = climat.onglets.find((o) => o.id === "chaleur")?.valeurs;
  const iChaud = chaleur ? chaleur.indexOf(Math.max(...chaleur)) : -1;
  return (
    <section className="flex flex-col gap-5 rounded-[28px] bg-white p-5 sm:p-[26px]">
      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">Ce que la pluie et la chaleur font à votre sol</h2>
        <p className="m-0 text-[15px] leading-normal text-muted">Le même climat abîme ou protège le sol selon qu&apos;il est nu ou couvert. Dans votre région :</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-[#E3F0F8] p-4">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="#2F7DBF"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></svg></span>
          <span className="flex flex-col">
            <strong className="font-display text-[22px] leading-tight">{`${climat.pluieMensuelle[iPluie]} mm`}</strong>
            <span className="text-sm text-muted">{`de pluie en ${MOIS[iPluie]}, le mois le plus pluvieux`}</span>
          </span>
        </div>
        {chaleur && iChaud >= 0 && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#FCEBD3] p-4">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F7A600" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" fill="#F7A600" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></svg></span>
            <span className="flex flex-col">
              <strong className="font-display text-[22px] leading-tight">{`${chaleur[iChaud]} °C`}</strong>
              <span className="text-sm text-muted">{`en ${MOIS[iChaud]}, le mois le plus chaud (°C de maximum moyen dans l'air)`}</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-[15px] font-bold">Quand il pleut fort</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Carte bon={false} dessin={DESSINS.pluieNu} titre="Sol nu" texte="L'eau ruisselle au lieu d'entrer : elle emporte la terre fertile de surface (érosion) et creuse des rigoles." />
          <Carte bon dessin={DESSINS.pluieCouvert} titre="Sol couvert de plantes" texte="Les plantes et leurs racines freinent l'eau : elle s'infiltre et reste dans le sol pour les semaines sèches." />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="m-0 text-[15px] font-bold">Quand il fait très chaud</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Carte bon={false} dessin={DESSINS.chaleurNu} titre="Sol nu" texte="La surface dépasse souvent 45 °C : une croûte dure se forme, le sol se fend, l'eau s'évapore et la matière organique se dégrade." />
          <Carte bon dessin={DESSINS.chaleurPaille} titre="Sol paillé" texte="Le paillage (résidus de récolte, herbes) fait de l'ombre au sol : il reste plus frais, garde son humidité et sa vie." />
        </div>
      </div>

      <p className="m-0 text-xs text-muted">Dessins explicatifs. Chiffres : NASA POWER, 2005–2025, au chef-lieu de la région.</p>
    </section>
  );
}
