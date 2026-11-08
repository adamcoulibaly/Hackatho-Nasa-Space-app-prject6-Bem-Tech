/** Adresse du site ForoSat affiché dans l'app (variable d'environnement définie au build). */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "").replace(/\/+$/, "");

export const COULEURS = {
  encre: "#07120D",
  papier: "#F4F6F1",
  orange: "#F77F00",
  vert: "#009E60",
  attenue: "#9DB0A5",
  ligne: "#2A4234",
} as const;

/** Adresse d'une page du site en mode app (sans en-tête ni barre du bas du site). */
export function urlPage(chemin: string): string {
  const separateur = chemin.includes("?") ? "&" : "?";
  return `${WEB_URL}${chemin}${separateur}app=1`;
}

/** Vrai pour une adresse du site ForoSat ; les autres liens (WhatsApp…) s'ouvrent hors de l'app. */
export function estPageForoSat(url: string): boolean {
  return WEB_URL !== "" && (url === WEB_URL || url.startsWith(`${WEB_URL}/`) || url.startsWith(`${WEB_URL}?`));
}
