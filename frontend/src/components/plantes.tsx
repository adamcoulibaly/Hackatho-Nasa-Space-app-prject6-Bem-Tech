/**
 * Dessins des cultures ForoSat : un dessin par culture (maïs, sorgho, riz, coton, arachide, niébé, igname, manioc),
 * réutilisé partout (choix des cultures, rotations, fiche, simulateur). Coordonnées locales : le pied de la plante
 * est en (0, 0), la plante monte vers les y négatifs ; ce qui pousse sous terre (tubercules, gousses) est en y > 0.
 */
import type { Stade } from "@/lib/moteur/simulation";

export type Teintes = { feuille: string; clair: string; tige: string };
export const TEINTES_SAINES: Teintes = { feuille: "#1F7A3A", clair: "#3FA34D", tige: "#2D6B33" };

type Props = { culture?: string | null; stade: Stade; t: Teintes; perdu?: boolean };

const norm = (c?: string | null) => (c ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Lame de feuille de graminée, du nœud vers l'extrémité, côté `s` (1 droite, −1 gauche). */
const lame = (y: number, l: number, s: number, couleur: string) => (
  <path d={`M0 ${y} C${s * l * 0.35} ${y - 8} ${s * l * 0.8} ${y - 8} ${s * l} ${y + 2} C${s * l * 0.7} ${y - 3} ${s * l * 0.35} ${y - 2} 0 ${y + 4}Z`} fill={couleur} />
);
const coeur = (x: number, y: number, k: number, couleur: string, r = 0) => (
  <path d="M0 0 C-7 -6 -7 -14 0 -10 C7 -14 7 -6 0 0Z" fill={couleur} transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`} />
);

function Mais({ stade, t, perdu }: Props) {
  return (
    <g>
      <path d="M0 2V-64" stroke={t.tige} strokeWidth="3.2" strokeLinecap="round" />
      {lame(-14, 30, -1, t.feuille)}
      {lame(-26, 30, 1, t.clair)}
      {lame(-38, 27, -1, t.feuille)}
      {lame(-50, 22, 1, t.clair)}
      {(stade === "floraison" || stade === "maturite") && <path d="M0 -64 l-6 -10 M0 -64 l0 -12 M0 -64 l6 -10" stroke={perdu ? "#C9B07A" : "#E9C46A"} strokeWidth="2.4" strokeLinecap="round" />}
      {stade === "maturite" && <ellipse cx="5" cy="-36" rx="4.6" ry="10" fill={perdu ? "#B79A62" : "#E2B33C"} stroke={perdu ? "#9C7F4C" : "#C48F1F"} strokeWidth="1" transform="rotate(18 5 -36)" />}
    </g>
  );
}

function Sorgho({ stade, t, perdu }: Props) {
  const grain = stade === "maturite" ? (perdu ? "#B79A62" : "#A0442A") : perdu ? "#C9B07A" : "#D9B44A";
  return (
    <g>
      <path d="M0 2V-58" stroke={t.tige} strokeWidth="3" strokeLinecap="round" />
      {lame(-12, 26, 1, t.feuille)}
      {lame(-24, 26, -1, t.clair)}
      {lame(-36, 22, 1, t.feuille)}
      {lame(-46, 18, -1, t.clair)}
      {(stade === "floraison" || stade === "maturite") && (
        <g fill={grain}>
          {[[0, -62], [-3, -66], [3, -66], [0, -70], [-3, -73], [3, -73], [0, -76]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" />)}
        </g>
      )}
    </g>
  );
}

function Riz({ stade, t, perdu }: Props) {
  const epi = perdu ? "#C9B07A" : stade === "maturite" ? "#D9A93A" : "#EDE3B0";
  return (
    <g>
      {[-10, -6, -2, 2, 6, 10].map((x, i) => (
        <path key={x} d={`M0 2 Q${x * 0.4} -20 ${x * 1.6} -${40 + (i % 3) * 6}`} stroke={i % 2 ? t.clair : t.feuille} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ))}
      {(stade === "floraison" || stade === "maturite") &&
        [-1, 1].map((s) => <path key={s} d={`M${s * 6} -40 q${s * 8} -4 ${s * 12} 8`} stroke={epi} strokeWidth="3.4" fill="none" strokeLinecap="round" strokeDasharray="2.5 1.5" />)}
    </g>
  );
}

function Coton({ stade, t, perdu }: Props) {
  return (
    <g>
      <path d="M0 2V-46 M0 -20 L-14 -32 M0 -28 L14 -40" stroke={t.tige} strokeWidth="2.6" strokeLinecap="round" />
      {[[-16, -34], [16, -42], [0, -48], [-9, -22], [9, -28]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} fill={i % 2 ? t.clair : t.feuille}>
          <circle r="6.5" />
          <circle cx="-5" cy="-3" r="4.5" />
          <circle cx="5" cy="-3" r="4.5" />
        </g>
      ))}
      {stade === "floraison" && [[-12, -40], [10, -48]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill={perdu ? "#C9B07A" : "#F4D9E6"} stroke="#E8A6C4" strokeWidth="1" />)}
      {stade === "maturite" && [[-14, -38], [12, -46], [0, -53], [-6, -27]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={perdu ? "#E3D8C3" : "#FFFFFF"} stroke="#D7D3C8" strokeWidth="1" />)}
    </g>
  );
}

function Arachide({ stade, t, perdu }: Props) {
  return (
    <g>
      <path d="M0 2V-20 M0 -10 L-14 -18 M0 -12 L14 -20" stroke={t.tige} strokeWidth="2.4" strokeLinecap="round" />
      {[[-17, -19], [-11, -23], [17, -21], [11, -25], [-4, -24], [4, -26]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="5.2" ry="3.8" fill={i % 2 ? t.clair : t.feuille} />
      ))}
      {stade === "floraison" && [[-8, -30], [8, -31]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={perdu ? "#C9B07A" : "#F2C230"} />)}
      {stade === "maturite" &&
        [[-8, 8], [7, 10]].map(([x, y], i) => (
          <path key={i} d={`M${x - 5} ${y} c0 -4 4 -4 5 -2 c1 -2 5 -2 5 2 c0 4 -4 4 -5 2 c-1 2 -5 2 -5 -2Z`} fill={perdu ? "#B79A62" : "#D9B98A"} stroke="#9C7A4C" strokeWidth="0.8" />
        ))}
    </g>
  );
}

function Niebe({ stade, t, perdu }: Props) {
  const trifolie = (x: number, y: number, c: string) => (
    <g transform={`translate(${x} ${y})`} fill={c}>
      <ellipse cx="0" cy="-5" rx="3" ry="5.5" />
      <ellipse cx="-5" cy="0" rx="3" ry="5" transform="rotate(-60 -5 0)" />
      <ellipse cx="5" cy="0" rx="3" ry="5" transform="rotate(60 5 0)" />
    </g>
  );
  return (
    <g>
      <path d="M0 2 C-2 -10 6 -16 2 -26 M1 -14 C-10 -16 -14 -22 -18 -18 M2 -20 C12 -22 16 -28 20 -24" stroke={t.tige} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {trifolie(-16, -22, t.feuille)}
      {trifolie(18, -28, t.clair)}
      {trifolie(2, -32, t.feuille)}
      {stade === "floraison" && [[-6, -36], [10, -38]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={perdu ? "#C9B07A" : "#B48AD6"} />)}
      {stade === "maturite" && [[-10, -14], [12, -18], [4, -22]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q2 10 -1 18`} stroke={perdu ? "#B79A62" : "#8FA43A"} strokeWidth="2.6" fill="none" strokeLinecap="round" />)}
    </g>
  );
}

function Igname({ stade, t, perdu }: Props) {
  return (
    <g>
      <path d="M0 4V-64" stroke="#8C6A43" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M0 0 C8 -8 -8 -16 0 -24 C8 -32 -8 -40 0 -48 C6 -54 -4 -58 0 -62" stroke={t.tige} strokeWidth="1.8" fill="none" />
      {coeur(-6, -12, 0.9, t.feuille, -20)}
      {coeur(6, -24, 0.9, t.clair, 20)}
      {coeur(-6, -36, 0.85, t.feuille, -20)}
      {coeur(6, -48, 0.8, t.clair, 20)}
      {coeur(-4, -58, 0.7, t.feuille, -15)}
      {stade === "maturite" && <ellipse cx="2" cy="10" rx="9" ry="6" fill={perdu ? "#9C7F4C" : "#7A4A26"} stroke="#4E2E14" strokeWidth="1" />}
    </g>
  );
}

function Manioc({ stade, t, perdu }: Props) {
  const palme = (x: number, y: number, c: string, k: number) => (
    <g transform={`translate(${x} ${y}) scale(${k})`} fill={c}>
      {[-70, -35, 0, 35, 70].map((r) => <ellipse key={r} cx="0" cy="-9" rx="2.6" ry="9" transform={`rotate(${r})`} />)}
    </g>
  );
  return (
    <g>
      <path d="M0 2V-52 M0 -40 L-12 -50 M0 -44 L12 -56" stroke="#8C6A43" strokeWidth="3" strokeLinecap="round" />
      {[-12, -24, -34].map((y) => <path key={y} d={`M-2 ${y}h4`} stroke="#5E4426" strokeWidth="1.2" />)}
      {palme(-12, -50, t.feuille, 1)}
      {palme(12, -56, t.clair, 1)}
      {palme(0, -54, t.feuille, 0.9)}
      {stade === "maturite" && [[-8, 6, -25], [8, 7, 25], [0, 9, 0]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="2.8" ry="8" fill={perdu ? "#9C7F4C" : "#9A5B2E"} transform={`rotate(${r} ${x} ${y})`} />)}
    </g>
  );
}

function Generique({ t }: Props) {
  return (
    <g>
      <path d="M0 2V-36" stroke={t.tige} strokeWidth="2.6" strokeLinecap="round" />
      {[[-9, -14, -30], [9, -20, 30], [-8, -28, -30], [8, -34, 30]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="8" ry="4" fill={i % 2 ? t.clair : t.feuille} transform={`rotate(${r} ${x} ${y})`} />
      ))}
    </g>
  );
}

/** La plante d'une culture à un stade donné. */
export function PlanteCulture(p: Props) {
  const c = norm(p.culture);
  if (c.startsWith("mais")) return <Mais {...p} />;
  if (c.startsWith("sorgho") || c.startsWith("mil")) return <Sorgho {...p} />;
  if (c.startsWith("riz")) return <Riz {...p} />;
  if (c.startsWith("coton")) return <Coton {...p} />;
  if (c.startsWith("arachide")) return <Arachide {...p} />;
  if (c.startsWith("niebe") || c.startsWith("haricot") || c.startsWith("soja")) return <Niebe {...p} />;
  if (c.startsWith("igname")) return <Igname {...p} />;
  if (c.startsWith("manioc")) return <Manioc {...p} />;
  return <Generique {...p} />;
}

/** Vrai pour le riz : la scène montre alors une rizière (sol en eau). */
export const estRiz = (culture?: string | null) => norm(culture).startsWith("riz");

/** Petite icône d'une culture à maturité, sur une bande de sol (décorative : le nom de la culture est écrit à côté). */
export function IconeCulture({ culture, taille = 28, className = "" }: { culture: string; taille?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={taille} height={taille} viewBox="-34 -78 68 92" className={`shrink-0 ${className}`}>
      <rect x="-34" y="0" width="68" height="14" rx="5" fill={estRiz(culture) ? "#6FA8C9" : "#8A5A2B"} />
      <PlanteCulture culture={culture} stade="maturite" t={TEINTES_SAINES} />
    </svg>
  );
}
