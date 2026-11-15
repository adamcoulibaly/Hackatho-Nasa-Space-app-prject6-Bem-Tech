/**
 * Guide pas à pas pour les nouveaux utilisateurs : une bulle montre où toucher, puis passe à la suite
 * quand l'utilisateur l'a fait. Le même guide sert le site et l'app mobile (qui affiche le site) :
 * l'état vit dans le stockage local, partagé par les onglets de l'app.
 */

/** Comment une étape se termine : un toucher sur la zone montrée, un événement de l'app, ou le bouton « Suivant ». */
export type Avance = "clic" | "evenement" | "suivant";

export type EtapeGuide = {
  id: string;
  /** Page où l'étape se joue : chemin exact, ou préfixe terminé par « /* ». */
  chemin: string;
  /** Page à ouvrir pour reprendre l'étape depuis ailleurs. */
  lien: string;
  /** Valeur de l'attribut data-guide de la zone à éclairer (aucune : bulle seule). */
  cible?: string;
  /** Sélecteur des éléments dont le toucher termine l'étape (par défaut : la zone éclairée). */
  declencheur?: string;
  /** Événement (signalerGuide) qui termine l'étape. */
  evenement?: string;
  avance: Avance;
  titre: string;
  texte: string;
  /** Texte propre à l'app mobile, quand il diffère. */
  texteApp?: string;
};

export const ETAPES: readonly EtapeGuide[] = [
  {
    id: "intro", chemin: "/parcelle", lien: "/parcelle", avance: "suivant",
    titre: "Bienvenue sur ForoSat",
    texte: "Je vous montre où toucher, étape par étape. En deux minutes, vous saurez quelle rotation tient le mieux sur votre champ.",
  },
  {
    id: "lieu", chemin: "/parcelle", lien: "/parcelle", cible: "lieu", declencheur: '[data-guide="position"], [data-guide="lieu-trouve"]', avance: "clic",
    titre: "Situez votre champ",
    texte: "Au champ ? Touchez « Ma position ». Sinon, tapez le nom de votre village, puis touchez-le dans la liste.",
  },
  {
    id: "dessiner", chemin: "/parcelle", lien: "/parcelle", cible: "dessiner", avance: "clic",
    titre: "Dessinez votre champ",
    texte: "Touchez « Dessiner ma parcelle ».",
  },
  {
    id: "contour", chemin: "/parcelle", lien: "/parcelle", cible: "carte", declencheur: '[data-guide="terminer"]', avance: "clic",
    titre: "Touchez chaque coin",
    texte: "Touchez la carte à chaque coin de votre champ (3 au moins), puis « Terminer le contour ». La surface se calcule toute seule.",
  },
  {
    id: "pente", chemin: "/parcelle", lien: "/parcelle", cible: "pente", avance: "suivant",
    titre: "La pente de votre champ",
    texte: "Dès que le contour est fermé, ForoSat calcule sa pente avec l'altitude SRTM de la NASA. Plus elle est forte, plus la pluie emporte la terre : suivez le conseil anti-érosion.",
  },
  {
    id: "couches", chemin: "/parcelle", lien: "/parcelle", cible: "couches", declencheur: '[data-guide="couches"] button', avance: "clic",
    titre: "Votre zone vue de l'espace",
    texte: "Touchez une couche NASA : végétation, chaleur du sol, humidité du sol ou pluie des satellites GPM. Ce qu'elle veut dire pour votre champ s'affiche juste en dessous.",
  },
  {
    id: "cultures", chemin: "/parcelle", lien: "/parcelle", cible: "cultures", avance: "suivant",
    titre: "Ce que vous cultivez",
    texte: "Touchez vos cultures d'aujourd'hui, dans l'ordre des saisons (3 au plus).",
  },
  {
    id: "priorites", chemin: "/parcelle", lien: "/parcelle", cible: "priorites", avance: "suivant",
    titre: "Ce qui compte pour vous",
    texte: "Cochez vos priorités : ForoSat note les rotations selon elles.",
  },
  {
    id: "analyser", chemin: "/parcelle", lien: "/parcelle", cible: "analyser", evenement: "parcelle-analysee", avance: "evenement",
    titre: "Lancez l'analyse",
    texte: "Touchez « Analyser ma parcelle » : ForoSat lit vingt ans de mesures NASA de votre région.",
  },
  {
    id: "rotations", chemin: "/rotations", lien: "/rotations", cible: "rotation-conseillee", avance: "suivant",
    titre: "Vos trois rotations",
    texte: "A, c'est ce que vous faites aujourd'hui ; B et C sont deux autres chemins. Celle marquée « Recommandée » tient le mieux sur votre parcelle.",
  },
  {
    id: "detail", chemin: "/rotations", lien: "/rotations", cible: "detail-conseille", avance: "clic",
    titre: "Ouvrez la rotation conseillée",
    texte: "Touchez « Voir le détail » : pourquoi elle ressort, ses risques, et vingt saisons réelles rejouées.",
  },
  {
    id: "changer", chemin: "/rotations/*", lien: "/rotations/A", cible: "changer-rotation", avance: "suivant",
    titre: "Passez d'une rotation à l'autre",
    texte: "Touchez A, B ou C ici pour comparer, sans revenir en arrière.",
  },
  {
    id: "assistant", chemin: "/rotations/*", lien: "/rotations/A", cible: "assistant", declencheur: '[data-guide="assistant"] button', avance: "clic",
    titre: "Demandez à l'assistant",
    texte: "Écrivez ou dites votre question avec le micro, ou touchez « Comparer avec… » : l'assistant explique avec les données de votre parcelle.",
  },
  {
    id: "simuler", chemin: "/simulateur", lien: "/simulateur", cible: "simulation", avance: "suivant",
    titre: "Testez avant de semer",
    texte: "Choisissez une durée et une année sèche ou très pluvieuse : le verdict et les rendements s'affichent juste en dessous.",
  },
  {
    id: "climat", chemin: "/climat", lien: "/climat", cible: "pluie-satellite", avance: "suivant",
    titre: "Un climat vérifié par satellite",
    texte: "La pluie de NASA POWER est comparée à celle mesurée par les satellites GPM : ForoSat vous dit si les quantités sont fiables. Plus bas, ECOSTRESS montre la chaleur au ras des champs.",
  },
  {
    id: "suivre", chemin: "/tableau", lien: "/tableau", cible: "tableau", avance: "suivant",
    titre: "Suivez votre saison",
    texte: "Chaque jour, l'accueil montre l'état du semis, la pluie et les alertes, avec un conseil.",
  },
  {
    id: "raccourcis", chemin: "/tableau", lien: "/tableau", cible: "raccourcis", avance: "suivant",
    titre: "Tout est à un toucher",
    texte: "Calendrier, carnet de suivi, votre parcelle aujourd'hui : tout part d'ici. Vous pouvez relancer ce guide depuis « Guide d'utilisation ».",
    texteApp: "Calendrier, carnet de suivi, votre parcelle aujourd'hui : tout part d'ici. Les onglets en bas de l'écran vous ramènent à chaque partie.",
  },
];

/** Nombre d'étapes comptées pour l'utilisateur (l'accueil n'en est pas une). */
export const NB_ETAPES = ETAPES.length - 1;

export type StatutGuide = "en-cours" | "termine" | "ferme";
export type EtatGuide = { etape: number; statut: StatutGuide };

export const CLE_GUIDE = "forosat.guide";
/** Événement de fenêtre par lequel l'app signale une action au guide. */
export const EVENEMENT_GUIDE = "forosat:guide";

export function cheminCorrespond(motif: string, chemin: string): boolean {
  const p = chemin.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (motif.endsWith("/*")) return p.startsWith(motif.slice(0, -1)) && p.length > motif.length - 1;
  return p === motif;
}

export function lireEtatGuide(stockage: Pick<Storage, "getItem"> | undefined = typeof localStorage === "undefined" ? undefined : localStorage): EtatGuide | null {
  try {
    const brut = stockage?.getItem(CLE_GUIDE);
    if (!brut) return null;
    const v = JSON.parse(brut) as Partial<EtatGuide>;
    if (typeof v.etape !== "number" || !Number.isInteger(v.etape) || v.etape < 0 || v.etape >= ETAPES.length) return null;
    if (v.statut !== "en-cours" && v.statut !== "termine" && v.statut !== "ferme") return null;
    return { etape: v.etape, statut: v.statut };
  } catch {
    return null;
  }
}

export function ecrireEtatGuide(etat: EtatGuide): void {
  try {
    localStorage.setItem(CLE_GUIDE, JSON.stringify(etat));
  } catch {
    // Stockage indisponible (navigation privée) : le guide vit le temps de la page.
  }
}

/** Étape suivante, ou fin du guide après la dernière. */
export function etapeSuivante(etat: EtatGuide): EtatGuide {
  if (etat.etape >= ETAPES.length - 1) return { etape: etat.etape, statut: "termine" };
  return { etape: etat.etape + 1, statut: "en-cours" };
}

/** Le guide démarre seul pour un nouveau venu : jamais vu, et aucune parcelle encore analysée. */
export function demarrageAuto(etat: EtatGuide | null, parcelleSaisie: boolean): boolean {
  return etat === null && !parcelleSaisie;
}

/** Une action de l'app (ex. parcelle analysée) que le guide attend peut-être. */
export function signalerGuide(nom: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENEMENT_GUIDE, { detail: nom }));
}

export type Rect = { top: number; left: number; width: number; height: number };
export type Placement = { top: number; left: number; cote: "dessous" | "dessus" | "droite" | "gauche" | "haut" | "bas" };

/**
 * Place la bulle sous la zone éclairée, sinon au-dessus ; si la zone est trop haute pour l'un et l'autre
 * (la carte sur téléphone), en haut ou en bas de l'écran, là où elle en cache le moins.
 * Toujours entière dans la fenêtre, avec une marge.
 */
export function placerBulle(zone: Rect | null, bulle: { width: number; height: number }, vue: { width: number; height: number }, marge = 16, ecart = 14, basReserve = 0): Placement {
  const left = (x: number) => Math.round(Math.min(Math.max(x, marge), Math.max(marge, vue.width - bulle.width - marge)));
  const bas = { top: Math.round(Math.max(marge, vue.height - basReserve - bulle.height - marge)), left: left((vue.width - bulle.width) / 2), cote: "bas" as const };
  if (!zone) return bas;
  const centre = zone.left + zone.width / 2 - bulle.width / 2;
  const dessous = zone.top + zone.height + ecart;
  if (dessous + bulle.height <= vue.height - basReserve - marge) return { top: Math.round(dessous), left: left(centre), cote: "dessous" };
  const dessus = zone.top - ecart - bulle.height;
  if (dessus >= marge) return { top: Math.round(dessus), left: left(centre), cote: "dessus" };
  // Grand écran : à côté de la zone, alignée sur son haut visible.
  const cote = Math.round(Math.min(Math.max(zone.top, marge), vue.height - basReserve - bulle.height - marge));
  if (zone.left + zone.width + ecart + bulle.width <= vue.width - marge) return { top: cote, left: Math.round(zone.left + zone.width + ecart), cote: "droite" };
  if (zone.left - ecart - bulle.width >= marge) return { top: cote, left: Math.round(zone.left - ecart - bulle.width), cote: "gauche" };
  const haut = { top: marge, left: bas.left, cote: "haut" as const };
  const cache = (top: number) => Math.max(0, Math.min(top + bulle.height, zone.top + zone.height) - Math.max(top, zone.top));
  return cache(haut.top) < cache(bas.top) ? haut : bas;
}

/** Événement qui demande au guide affiché de relire son état (relance depuis un bouton). */
export const EVENEMENT_RELIRE = "forosat:guide-relire";

/** Relance le guide depuis la première vraie étape (l'accueil est sauté : l'utilisateur l'a demandé). */
export function demarrerGuide(): void {
  ecrireEtatGuide({ etape: 1, statut: "en-cours" });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENEMENT_RELIRE));
}
