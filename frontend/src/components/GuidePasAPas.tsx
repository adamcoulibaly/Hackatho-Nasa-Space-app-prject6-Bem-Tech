"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParcelle } from "@/lib/parcelle/context";
import { estModeApp } from "@/lib/modeApp";
import {
  ETAPES, EVENEMENT_GUIDE, EVENEMENT_RELIRE, NB_ETAPES, CLE_GUIDE,
  cheminCorrespond, demarrageAuto, ecrireEtatGuide, etapeSuivante, lireEtatGuide, placerBulle,
  type EtatGuide, type Placement, type Rect,
} from "@/lib/guide";

/** Marge autour de la zone éclairée. */
const BORD = 8;
/** Délai avant d'afficher la bulle seule quand la zone n'apparaît pas (page encore en calcul). */
const ATTENTE_ZONE = 2500;

/** Hauteur cachée par la barre du bas du site sur téléphone (l'app a sa propre barre, hors de la page). */
const reserveBas = (app: boolean) => (!app && window.innerWidth < 768 ? 90 : 0);
/** Hauteur approximative de la bulle, pour savoir si la zone et la bulle tiennent ensemble à l'écran. */
const HAUTEUR_BULLE = 240;

const pareil = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/**
 * Guide pas à pas : éclaire la zone à toucher, explique quoi faire, et passe à l'étape suivante
 * quand l'utilisateur l'a fait. Sur une autre page, une barre propose d'aller à l'étape en cours.
 */
export function GuidePasAPas() {
  const chemin = usePathname() ?? "/";
  const { saisie, pret } = useParcelle();
  const [etat, setEtat] = useState<EtatGuide | null>(null);
  const [charge, setCharge] = useState(false);
  const [app, setApp] = useState(false);
  const etatRef = useRef<EtatGuide | null>(null);

  const changer = useCallback((e: EtatGuide) => {
    etatRef.current = e;
    ecrireEtatGuide(e);
    setEtat(e);
  }, []);

  // État lu au chargement, puis relu quand une autre page ou un autre onglet de l'app l'a changé.
  useEffect(() => {
    const relire = () => {
      const e = lireEtatGuide();
      etatRef.current = e;
      setEtat(e);
    };
    relire();
    setApp(estModeApp());
    setCharge(true);
    const surVisibilite = () => { if (document.visibilityState === "visible") relire(); };
    const surStockage = (e: StorageEvent) => { if (e.key === CLE_GUIDE) relire(); };
    window.addEventListener("storage", surStockage);
    window.addEventListener("forosat:sync", relire);
    window.addEventListener(EVENEMENT_RELIRE, relire);
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      window.removeEventListener("storage", surStockage);
      window.removeEventListener("forosat:sync", relire);
      window.removeEventListener(EVENEMENT_RELIRE, relire);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, []);

  // Premier passage sur la page du champ, sans parcelle analysée : le guide démarre seul.
  // (Pas pendant les tests automatisés, où il masquerait les éléments testés.)
  useEffect(() => {
    if (!charge || !pret || !cheminCorrespond("/parcelle", chemin)) return;
    if (navigator.webdriver) return;
    if (demarrageAuto(etatRef.current, saisie)) changer({ etape: 0, statut: "en-cours" });
  }, [charge, pret, saisie, chemin, changer]);

  const avancer = useCallback(() => {
    const e = etatRef.current;
    if (e && e.statut === "en-cours") changer(etapeSuivante(e));
  }, [changer]);
  const quitter = useCallback(() => {
    const e = etatRef.current;
    changer({ etape: e?.etape ?? 0, statut: "ferme" });
  }, [changer]);

  const etape = etat?.statut === "en-cours" ? ETAPES[etat.etape] : null;
  const surPage = !!etape && cheminCorrespond(etape.chemin, chemin);

  // L'étape se termine quand l'utilisateur touche la zone (avant toute navigation) ou quand l'app signale l'action.
  useEffect(() => {
    if (!etape || !surPage) return;
    if (etape.avance === "clic") {
      const selecteur = etape.declencheur ?? `[data-guide="${etape.cible}"]`;
      const surClic = (e: MouseEvent) => {
        if ((e.target as Element | null)?.closest?.(selecteur)) avancer();
      };
      window.addEventListener("click", surClic, true);
      return () => window.removeEventListener("click", surClic, true);
    }
    if (etape.avance === "evenement") {
      const surEvenement = (e: Event) => {
        if ((e as CustomEvent<string>).detail === etape.evenement) avancer();
      };
      window.addEventListener(EVENEMENT_GUIDE, surEvenement);
      return () => window.removeEventListener(EVENEMENT_GUIDE, surEvenement);
    }
  }, [etape, surPage, avancer]);

  useEffect(() => {
    if (!etape) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape") quitter(); };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [etape, quitter]);

  if (!charge || !etape || !etat || cheminCorrespond("/bienvenue", chemin)) return null;
  if (!surPage) return <BarreReprise etape={etat.etape} app={app} onQuitter={quitter} />;
  return <Bulle key={etape.id} etat={etat} app={app} onSuivant={avancer} onQuitter={quitter} />;
}

function Bulle({ etat, app, onSuivant, onQuitter }: { etat: EtatGuide; app: boolean; onSuivant: () => void; onQuitter: () => void }) {
  const etape = ETAPES[etat.etape];
  const [zone, setZone] = useState<Rect | null>(null);
  const [sansZone, setSansZone] = useState(!etape.cible);
  const [place, setPlace] = useState<Placement | null>(null);
  const bulle = useRef<HTMLDivElement>(null);

  // Suit la zone à éclairer (elle peut apparaître après un calcul, bouger au défilement ou au redimensionnement).
  useEffect(() => {
    if (!etape.cible) return;
    let image = 0;
    let vue = false;
    const debut = performance.now();
    const suivre = () => {
      const el = document.querySelector<HTMLElement>(`[data-guide="${etape.cible}"]`);
      const r = el?.getBoundingClientRect();
      if (el && r && r.width > 0 && r.height > 0) {
        if (!vue) {
          vue = true;
          const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
          const visible = window.innerHeight - reserveBas(app);
          if (r.height + HAUTEUR_BULLE + 32 > visible) {
            // Zone plus haute que l'écran (la carte sur téléphone) : son bas, où sont les boutons, reste visible.
            window.scrollBy?.({ top: r.bottom - (visible - 12), behavior: reduit ? "auto" : "smooth" });
          } else {
            el.scrollIntoView?.({ block: "center", behavior: reduit ? "auto" : "smooth" });
          }
        }
        const z = { top: Math.round(r.top - BORD), left: Math.round(r.left - BORD), width: Math.round(r.width + 2 * BORD), height: Math.round(r.height + 2 * BORD) };
        setZone((avant) => (pareil(avant, z) ? avant : z));
        setSansZone(false);
      } else {
        setZone(null);
        if (performance.now() - debut > ATTENTE_ZONE) setSansZone(true);
      }
      image = requestAnimationFrame(suivre);
    };
    image = requestAnimationFrame(suivre);
    return () => cancelAnimationFrame(image);
  }, [etape.cible, app]);

  // Place la bulle près de la zone, entière dans l'écran (au-dessus de la barre du bas du site sur téléphone).
  useLayoutEffect(() => {
    const b = bulle.current;
    if (!b) return;
    const placer = () => {
      const vue = { width: window.innerWidth, height: window.innerHeight };
      const p = placerBulle(zone, { width: b.offsetWidth, height: b.offsetHeight }, vue, 16, 14, reserveBas(app));
      setPlace((avant) => (avant && avant.top === p.top && avant.left === p.left && avant.cote === p.cote ? avant : p));
    };
    placer();
    window.addEventListener("resize", placer);
    return () => window.removeEventListener("resize", placer);
  }, [zone, app, sansZone]);

  if (!zone && !sansZone) return null;
  const numero = etat.etape;
  const derniere = etat.etape === ETAPES.length - 1;
  const texte = app && etape.texteApp ? etape.texteApp : etape.texte;

  return (
    <>
      {zone && (
        <div
          aria-hidden="true"
          data-testid="guide-zone"
          className="pointer-events-none fixed left-0 top-0 z-[1200] rounded-[22px] ring-[3px] ring-orange transition-transform duration-300"
          style={{ transform: `translate(${zone.left}px, ${zone.top}px)`, width: zone.width, height: zone.height, boxShadow: "0 0 0 9999px rgba(7, 18, 13, 0.55)" }}
        />
      )}
      <div
        ref={bulle}
        role="dialog"
        aria-modal="false"
        aria-labelledby="guide-titre"
        aria-describedby="guide-texte"
        data-testid="guide-bulle"
        className="guide-bulle fixed z-[1250] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2 rounded-3xl bg-ink p-4 text-paper sm:gap-3 sm:p-5 shadow-[0_14px_40px_rgba(7,18,13,0.35)]"
        style={place ? { top: place.top, left: place.left } : { top: 0, left: 0, visibility: "hidden" }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-orange">{numero === 0 ? "Guide pas à pas" : `Étape ${numero} sur ${NB_ETAPES}`}</span>
          <button type="button" onClick={onQuitter} aria-label="Quitter le guide" className="-my-2 -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-xl text-[#C9D4CD] hover:text-paper">×</button>
        </div>
        {numero > 0 && (
          <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[#2A4234]">
            <div className="h-full rounded-full bg-orange" style={{ width: `${(numero / NB_ETAPES) * 100}%` }} />
          </div>
        )}
        <h2 id="guide-titre" className="m-0 font-display text-base font-bold tracking-[-0.02em] sm:text-lg">{etape.titre}</h2>
        <p id="guide-texte" aria-live="polite" className="m-0 text-sm leading-normal text-[#C9D4CD] sm:text-[15px]">{texte}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {numero === 0 ? (
            <>
              <button type="button" onClick={onQuitter} className="h-11 rounded-full px-3 text-[15px] font-semibold text-[#C9D4CD] hover:text-paper">Plus tard</button>
              <button type="button" onClick={onSuivant} className="h-11 rounded-full bg-orange px-5 text-[15px] font-bold text-ink">C&apos;est parti</button>
            </>
          ) : etape.avance === "suivant" ? (
            <>
              <span />
              <button type="button" onClick={onSuivant} className="h-11 rounded-full bg-orange px-5 text-[15px] font-bold text-ink">{derniere ? "Terminer" : "Suivant"}</button>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2 text-sm font-semibold text-orange">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-orange" />
                {zone ? "Touchez la zone entourée" : "Faites-le sur la page"}
              </span>
              <button type="button" onClick={onSuivant} className="h-11 rounded-full border border-[#2A4234] px-4 text-[15px] font-semibold text-paper">Passer</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Sur une autre page que celle de l'étape : une barre discrète pour reprendre le guide. */
function BarreReprise({ etape, app, onQuitter }: { etape: number; app: boolean; onQuitter: () => void }) {
  const e = ETAPES[etape];
  return (
    <div
      role="status"
      data-testid="guide-reprise"
      className={`guide-barre toast-entree fixed inset-x-4 z-[1250] mx-auto flex max-w-[520px] items-center gap-2 rounded-full bg-ink py-1.5 pl-5 pr-1.5 text-paper shadow-[0_10px_30px_rgba(7,18,13,0.3)] ${app ? "bottom-4" : "bottom-[96px] md:bottom-6"}`}
    >
      <span className="min-w-0 flex-1 text-sm leading-snug">
        <strong className="text-orange">{etape === 0 ? "Guide" : `Guide · ${etape}/${NB_ETAPES}`}</strong> {e.titre}
      </span>
      <Link href={e.lien} className="inline-flex h-11 shrink-0 items-center rounded-full bg-orange px-4 text-[15px] font-bold text-ink no-underline hover:text-ink">Continuer</Link>
      <button type="button" onClick={onQuitter} aria-label="Quitter le guide" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-[#C9D4CD] hover:text-paper">×</button>
    </div>
  );
}
