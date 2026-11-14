import type { Stade } from "@/lib/moteur/simulation";
import { PlanteCulture, estRiz, type Teintes } from "./plantes";

/** Croissance relative de la plante à chaque stade (la plante grandit en douceur quand le curseur bouge). */
const CROISSANCE: Record<Stade, number> = { sol_nu: 0, levee: 0.28, croissance: 0.62, floraison: 0.92, maturite: 1 };

/**
 * Parcelle vue de côté à une date de la simulation : ciel et soleil selon l'état de la saison, billons de terre
 * (craquelés en sécheresse), deux rangs de plantes de la culture qui grandissent au fil des stades FAO-56.
 */
export function PlanteIllustration({ stade, etat, culture }: { stade: Stade; etat: string; culture?: string | null }) {
  const stress = etat === "stress hydrique";
  const perdu = etat === "récolte compromise";
  const riz = estRiz(culture);
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
          <PlanteCulture culture={culture} stade={stade} t={t} perdu={perdu} />
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
      {riz && stade !== "sol_nu" && !perdu && <rect y="110" width="320" height="60" fill="#6FA8C9" opacity={stress ? 0.35 : 0.55} />}
      {(stress || perdu) && <path d="M30 132 l8 5 l-4 6 M120 162 l6 -6 l7 3 M210 130 l-6 6 l8 4 M280 160 l5 -7" stroke="#6E4520" strokeWidth="1.5" fill="none" strokeLinecap="round" />}
      {stade === "sol_nu" && <g fill="#5A3A1C">{[40, 95, 150, 205, 260].map((x) => <ellipse key={x} cx={x} cy="140" rx="3" ry="1.8" />)}</g>}
      {rang(117, [26, 72, 118, 164, 210, 256, 302], 0.78, 0.82)}
      {rang(148, [46, 98, 150, 202, 254], 1.25, 1)}
    </svg>
  );
}
