/** Mode « app » : le site affiché dans l'app mobile ForoSat (WebView, paramètre ?app=1). */

const CLE = "forosat.app";

export type MessageVersNatif = { type: "position" } | { type: "partager"; url: string; texte: string };
export type MessageDuNatif = { type: "position"; lat: number; lon: number };

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
      const m = JSON.parse(data) as Partial<MessageDuNatif>;
      if (m.type === "position" && Number.isFinite(m.lat) && Number.isFinite(m.lon)) rappel(m as MessageDuNatif);
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
