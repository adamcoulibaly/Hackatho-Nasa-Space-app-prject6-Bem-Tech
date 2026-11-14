import type { Stade } from "@/lib/moteur/simulation";

type Forme = "cereale" | "legumineuse" | "coton" | "tubercule";
type Teintes = { feuille: string; clair: string; tige: string };

/** Silhouette selon la culture : céréale haute, légumineuse basse et touffue, cotonnier buissonnant, tubercule à feuilles larges. */
function formeDe(culture?: string | null): Forme {
  const c = (culture ?? "").toLowerCase();
  if (/arachide|niébé|niebe|soja|haricot/.test(c)) return "legumineuse";
  if (/coton/.test(c)) return "coton";
  if (/igname|manioc|patate/.test(c)) return "tubercule";
  return "cereale";
}

/** Croissance relative de la plante à chaque stade (la plante grandit en douceur quand le curseur bouge). */
const CROISSANCE: Record<Stade, number> = { sol_nu: 0, levee: 0.28, croissance: 0.62, floraison: 0.92, maturite: 1 };

function Plante({ forme, stade, t, perdu }: { forme: Forme; stade: Stade; t: Teintes; perdu: boolean }) {
  const fleur = stade === "floraison";
  const mur = stade === "maturite";
  const feuille = (d: string, clair = false) => <path d={d} fill={clair ? t.clair : t.feuille} />;
  if (forme === "cereale") {
    return (
      <g>
        <path d="M0 0V-62" stroke={t.tige} strokeWidth="3" strokeLinecap="round" />
        {feuille("M0 -14 C-10 -20 -22 -20 -30 -12 C-20 -16 -10 -14 0 -10Z")}
        {feuille("M0 -26 C10 -34 22 -34 30 -26 C20 -29 10 -27 0 -22Z", true)}
        {feuille("M0 -38 C-9 -46 -20 -48 -27 -42 C-18 -44 -9 -41 0 -34Z")}
        {feuille("M0 -50 C8 -57 17 -58 23 -53 C15 -55 8 -52 0 -46Z", true)}
        {fleur && <path d="M0 -62 l-5 -9 M0 -62 l0 -11 M0 -62 l5 -9" stroke={perdu ? "#C9B07A" : "#E9C46A"} strokeWidth="2.5" strokeLinecap="round" />}
        {mur && <ellipse cx="5" cy="-36" rx="4.5" ry="10" fill={perdu ? "#B79A62" : "#E2B33C"} stroke={perdu ? "#9C7F4C" : "#C48F1F"} strokeWidth="1" transform="rotate(18 5 -36)" />}
      </g>
    );
  }
  if (forme === "legumineuse") {
    return (
      <g>
        <path d="M0 0V-24 M0 -12 L-12 -22 M0 -14 L12 -24" stroke={t.tige} strokeWidth="2.5" strokeLinecap="round" />
        {[[-14, -24], [14, -26], [0, -30], [-7, -16], [8, -18]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="8" ry="5.5" fill={i % 2 ? t.clair : t.feuille} transform={`rotate(${x * 2} ${x} ${y})`} />
        ))}
        {fleur && [[-10, -32], [6, -34], [15, -29]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" fill={perdu ? "#C9B07A" : "#F2C230"} />)}
        {mur && [[-12, -10], [11, -12]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q4 6 0 12`} stroke={perdu ? "#9C7F4C" : "#B07A3A"} strokeWidth="4" strokeLinecap="round" fill="none" />)}
      </g>
    );
  }
  if (forme === "coton") {
    return (
      <g>
        <path d="M0 0V-46 M0 -20 L-14 -32 M0 -28 L14 -40" stroke={t.tige} strokeWidth="2.5" strokeLinecap="round" />
        {[[-16, -34], [16, -42], [0, -48], [-9, -22], [9, -28]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="6.5" fill={i % 2 ? t.clair : t.feuille} />
            <circle cx="-5" cy="-3" r="4.5" fill={i % 2 ? t.clair : t.feuille} />
            <circle cx="5" cy="-3" r="4.5" fill={i % 2 ? t.clair : t.feuille} />
          </g>
        ))}
        {fleur && [[-12, -40], [10, -48]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill={perdu ? "#C9B07A" : "#F4D9E6"} stroke="#E8A6C4" strokeWidth="1" />)}
        {mur && [[-14, -38], [12, -46], [0, -52], [-6, -26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={perdu ? "#E3D8C3" : "#FFFFFF"} stroke="#D7D3C8" strokeWidth="1" />)}
      </g>
    );
  }
  return (
    <g>
      <path d="M0 0V-50" stroke={t.tige} strokeWidth="2.5" strokeLinecap="round" />
      {[[-14, -20, -30], [14, -26, 30], [-12, -38, -25], [12, -46, 25]].map(([x, y, r], i) => (
        <path key={i} d={`M0 ${y + 6} C${x} ${y + 4} ${x * 1.4} ${y - 8} ${x * 0.6} ${y - 12} C${x * 0.2} ${y - 6} 0 ${y} 0 ${y + 6}Z`} fill={i % 2 ? t.clair : t.feuille} transform={`rotate(${r / 4} 0 ${y})`} />
      ))}
      {fleur && <circle cx="0" cy="-53" r="3" fill={perdu ? "#C9B07A" : "#CFE3A0"} />}
      {mur && <g>{[[-8, 9], [7, 11]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="7" ry="4" fill={perdu ? "#9C7F4C" : "#8C5A2E"} stroke="#5E3A1A" strokeWidth="1" />)}</g>}
    </g>
  );
}

/**
 * Parcelle vue de côté à une date de la simulation : ciel et soleil selon l'état de la saison, billons de terre
 * (craquelés en sécheresse), deux rangs de plantes de la culture qui grandissent au fil des stades FAO-56.
 */
export function PlanteIllustration({ stade, etat, culture }: { stade: Stade; etat: string; culture?: string | null }) {
  const stress = etat === "stress hydrique";
  const perdu = etat === "récolte compromise";
  const forme = formeDe(culture);
  const t: Teintes = perdu
    ? { feuille: "#B8955A", clair: "#CDB07A", tige: "#9C7F4C" }
    : stress
      ? { feuille: "#8FA43A", clair: "#B5C45A", tige: "#7D8F36" }
      : { feuille: "#1F7A3A", clair: "#3FA34D", tige: "#2D6B33" };
  const ciel = perdu ? ["#E9D7B9", "#F7EEDF"] : stress ? ["#F6D9A2", "#FBF0DA"] : ["#BFE0F2", "#EAF5FA"];
  const sol = stress || perdu ? "#A6764A" : "#7A4E26";
  const billon = stress || perdu ? "#946640" : "#68411F";
  const g = CROISSANCE[stade];
  const id = `ciel-${stress ? "s" : perdu ? "p" : "n"}`;
  const rang = (y: number, xs: number[], echelle: number, opacite: number) =>
    stade !== "sol_nu" &&
    xs.map((x) => (
      <g key={`${y}-${x}`} transform={`translate(${x} ${y})`} opacity={opacite}>
        <g className="plante-pousse" style={{ transform: `scale(${echelle * (0.55 + 0.45 * g)}, ${echelle * g})` }}>
          <Plante forme={forme} stade={stade} t={t} perdu={perdu} />
        </g>
      </g>
    ));
  return (
    <svg viewBox="0 0 320 170" role="img" aria-label={`Parcelle : ${stade === "sol_nu" ? "sol nu" : stade}, ${etat}`} className="h-auto w-full max-w-[520px] overflow-hidden rounded-[22px]">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ciel[0]} />
          <stop offset="1" stopColor={ciel[1]} />
        </linearGradient>
        <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={stress || perdu ? "#F7A600" : "#FFD15C"} stopOpacity="0.55" />
          <stop offset="1" stopColor={stress || perdu ? "#F7A600" : "#FFD15C"} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="170" fill={`url(#${id})`} />
      <circle cx="270" cy="34" r="30" fill="url(#halo)" />
      <circle cx="270" cy="34" r={stress || perdu ? 14 : 12} fill={stress || perdu ? "#F7A600" : "#FFD15C"} />
      {!stress && !perdu && (
        <g fill="#FFFFFF" opacity="0.9">
          <path d="M40 38 a10 10 0 0 1 18 -6 a12 12 0 0 1 22 4 a8 8 0 0 1 0 16 h-36 a8 8 0 0 1 -4 -14z" />
          <path d="M150 24 a7 7 0 0 1 13 -4 a9 9 0 0 1 16 3 a6 6 0 0 1 0 12 h-26 a6 6 0 0 1 -3 -11z" opacity="0.8" />
        </g>
      )}
      <path d="M0 96 Q80 84 160 92 T320 88 V170 H0Z" fill={stress || perdu ? "#C9A46E" : "#7FB069"} opacity="0.55" />
      <rect y="108" width="320" height="62" fill={sol} />
      <path d="M0 116 Q160 106 320 116 V124 Q160 114 0 124Z" fill={billon} />
      <path d="M0 146 Q160 134 320 146 V156 Q160 144 0 156Z" fill={billon} />
      {(stress || perdu) && <path d="M30 132 l8 5 l-4 6 M120 162 l6 -6 l7 3 M210 130 l-6 6 l8 4 M280 160 l5 -7" stroke="#6E4520" strokeWidth="1.5" fill="none" strokeLinecap="round" />}
      {stade === "sol_nu" && <g fill="#5A3A1C">{[40, 95, 150, 205, 260].map((x) => <ellipse key={x} cx={x} cy="140" rx="3" ry="1.8" />)}</g>}
      {rang(117, [26, 72, 118, 164, 210, 256, 302], 0.78, 0.82)}
      {rang(148, [46, 98, 150, 202, 254], 1.25, 1)}
    </svg>
  );
}
