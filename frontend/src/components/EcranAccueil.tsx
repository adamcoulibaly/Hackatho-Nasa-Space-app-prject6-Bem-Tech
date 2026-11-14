import { Logo } from "./Logo";

/**
 * Écran de chargement à l'arrivée sur le site : le logo ForoSat sur fond sombre, puis il s'efface (1,4 s en tout).
 * Uniquement en CSS : il s'affiche avant même le JavaScript et disparaît seul, même sans lui. Il ne bloque
 * aucun clic (pointer-events: none) et il est ignoré par les lecteurs d'écran.
 */
export function EcranAccueil() {
  return (
    <div aria-hidden="true" className="ecran-accueil no-print fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-6 bg-ink">
      <div className="ecran-accueil-logo">
        <Logo size={120} anime />
      </div>
      <span className="ecran-accueil-logo font-display text-[34px] font-bold tracking-[-0.04em] text-paper">
        foro<span className="text-orange">sat</span>
      </span>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-[#1C3327]">
        <div className="ecran-accueil-barre h-full w-full rounded-full bg-orange" />
      </div>
    </div>
  );
}
