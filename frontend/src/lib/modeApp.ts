/** Mode « app » : le site affiché dans l'app mobile ForoSat (WebView, paramètre ?app=1). */

const CLE = "forosat.app";

/** Onglets natifs de l'app mobile. */
export type Onglet = "tableau" | "climat" | "rotations" | "champ";

export type MessageVersNatif =
  | { type: "position" }
  | { type: "partager"; url: string; texte: string }
  | { type: "ouvrir"; onglet: Onglet; chemin: string }
  | { type: "parcelle"; region: string; culture: string | null }
  | { type: "alerte"; action: "activer" | "desactiver" | "tester" }
  | { type: "photo" };
export type MessageDuNatif =
  | { type: "position"; lat: number; lon: number }
  | { type: "position"; erreur: "refus" | "indisponible" }
  | { type: "aller"; chemin: string }
  | { type: "sync" }
  | { type: "alerte"; etat: EtatAlerte }
  | { type: "photo"; image: string }
  | { type: "photo"; erreur: "refus" | "annule" };

export type EtatAlerte = "active" | "inactive" | "refus";
const ETATS_ALERTE: EtatAlerte[] = ["active", "inactive", "refus"];

/** Onglet natif qui porte une page du site ; null pour les pages qui s'ouvrent dans l'onglet courant (méthode, lexique…). */
export function ongletDe(chemin: string): Onglet | null {
  const p = chemin.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/tableau") return "tableau";
  if (p === "/parcelle") return "champ";
  if (p === "/climat" || p === "/risques") return "climat";
  if (p === "/rotations" || p.startsWith("/rotations/") || p.startsWith("/fiche/") || p === "/simulateur") return "rotations";
  return null;
}

/** Chemin interne du site (commence par un seul « / ») : seuls ceux-là circulent entre l'app et la page. */
export function estCheminInterne(chemin: unknown): chemin is string {
  return typeof chemin === "string" && chemin.startsWith("/") && !chemin.startsWith("//");
}

/**
 * Dans l'app, une page d'un autre onglet s'ouvre dans cet onglet (la barre native reste juste) :
 * renvoie true si l'app s'en charge, false si la page doit naviguer elle-même.
 */
export function ouvrirDansApp(chemin: string): boolean {
  if (!estModeApp()) return false;
  const cible = ongletDe(chemin);
  if (!cible || cible === ongletDe(window.location.pathname)) return false;
  const p = chemin.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return envoyerAuNatif({ type: "ouvrir", onglet: cible, chemin: p === "/" ? "/tableau" : chemin });
}

type Pont = { postMessage: (m: string) => void };

/** Vrai si la page a été ouverte avec ?app=1 pendant cette session. */
export function estModeApp(): boolean {
  if (typeof window === "undefined") return false;
  const dansUrl = new URLSearchParams(window.location.search).get("app") === "1";
  try {
    if (dansUrl) sessionStorage.setItem(CLE, "1");
    return dansUrl || sessionStorage.getItem(CLE) === "1";
  } catch {
    return dansUrl;
  }
}

/** Envoie un message à l'app native ; renvoie false hors de l'app (le navigateur garde alors son comportement). */
export function envoyerAuNatif(msg: MessageVersNatif): boolean {
  const pont = typeof window !== "undefined" ? (window as unknown as { ReactNativeWebView?: Pont }).ReactNativeWebView : undefined;
  if (!pont) return false;
  pont.postMessage(JSON.stringify(msg));
  return true;
}

/** Écoute les messages de l'app native (Android les envoie sur document, iOS sur window). */
export function ecouterNatif(rappel: (m: MessageDuNatif) => void): () => void {
  const gerer = (e: Event) => {
    const data = (e as MessageEvent).data;
    if (typeof data !== "string") return;
    try {
      const m = JSON.parse(data) as Partial<MessageDuNatif> & { chemin?: unknown };
      if (m.type === "sync") return rappel({ type: "sync" });
      if (m.type === "photo") {
        const { image, erreur } = m as { image?: unknown; erreur?: unknown };
        if (typeof image === "string" && image.startsWith("data:image/") && image.length <= 4_000_000) return rappel({ type: "photo", image });
        if (erreur === "refus" || erreur === "annule") return rappel({ type: "photo", erreur });
        return;
      }
      if (m.type === "alerte") {
        const etat = (m as { etat?: unknown }).etat;
        return ETATS_ALERTE.includes(etat as EtatAlerte) ? rappel({ type: "alerte", etat: etat as EtatAlerte }) : undefined;
      }
      if (m.type === "aller") return estCheminInterne(m.chemin) ? rappel({ type: "aller", chemin: m.chemin }) : undefined;
      if (m.type !== "position") return;
      if ("erreur" in m && (m.erreur === "refus" || m.erreur === "indisponible")) rappel({ type: "position", erreur: m.erreur });
      else if ("lat" in m && Number.isFinite(m.lat) && Number.isFinite(m.lon)) rappel(m as MessageDuNatif);
    } catch {
      /* message d'une autre origine : ignoré */
    }
  };
  window.addEventListener("message", gerer);
  document.addEventListener("message", gerer);
  return () => {
    window.removeEventListener("message", gerer);
    document.removeEventListener("message", gerer);
  };
}

/** Donne à l'app la région et la culture à semer (pour l'alerte de semis) ; false hors de l'app. */
export function envoyerParcelle(region: string, culture: string | null): boolean {
  return estModeApp() && envoyerAuNatif({ type: "parcelle", region, culture });
}
