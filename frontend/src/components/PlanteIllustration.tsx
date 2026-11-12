import type { Stade } from "@/lib/moteur/simulation";

/** Dessin d'une parcelle à un stade de culture : sol nu, levée, croissance, floraison, maturité ; teinte selon l'état. */
export function PlanteIllustration({ stade, etat }: { stade: Stade; etat: string }) {
  const stress = etat === "stress hydrique";
  const perdu = etat === "récolte compromise";
  const feuille = perdu ? "#B08A4A" : stress ? "#9DB04A" : "#2F8F3A";
  const hauteur = { sol_nu: 0, levee: 14, croissance: 34, floraison: 52, maturite: 50 }[stade];
  const plantes = [30, 70, 110, 150, 190, 230, 270];
  return (
    <svg viewBox="0 0 300 120" role="img" aria-label={`Parcelle : ${stade === "sol_nu" ? "sol nu" : stade}, ${etat}`} className="h-auto w-full max-w-[420px]">
      <rect x="0" y="0" width="300" height="120" rx="16" fill="#E8F1F7" />
      <circle cx="262" cy="24" r="12" fill={perdu || stress ? "#F7A600" : "#FFD15C"} />
      <rect x="0" y="92" width="300" height="28" fill={perdu ? "#B98A57" : "#8A5A2B"} />
      {stade === "sol_nu" && <path d="M20 100h40M90 104h50M180 100h60" stroke="#6E4520" strokeWidth="3" strokeLinecap="round" />}
      {stade !== "sol_nu" &&
        plantes.map((x) => (
          <g key={x} transform={`translate(${x} 92)`}>
            <path d={`M0 0V-${hauteur}`} stroke={feuille} strokeWidth="3" strokeLinecap="round" />
            <path d={`M0 -${hauteur * 0.45}q-10 -6 -14 -14M0 -${hauteur * 0.6}q10 -6 14 -14`} stroke={feuille} strokeWidth="3" fill="none" strokeLinecap="round" />
            {stade === "floraison" && <circle cy={-hauteur - 4} r="5" fill={perdu ? "#C9B07A" : "#F77F00"} />}
            {stade === "maturite" && <ellipse cy={-hauteur - 5} rx="4" ry="8" fill="#E2B33C" />}
          </g>
        ))}
    </svg>
  );
}
