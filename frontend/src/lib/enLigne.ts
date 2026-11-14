/** Connexion internet : les fonctions qui en ont besoin (assistant IA, photo, WhatsApp…) préviennent hors ligne. */
export const EVENEMENT_HORS_LIGNE = "forosat:hors-ligne";

export function estEnLigne(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/** true si internet est là ; sinon affiche « Désolé, connectez-vous à internet pour accéder à <quoi>. » et renvoie false. */
export function exigerInternet(quoi: string): boolean {
  if (estEnLigne()) return true;
  window.dispatchEvent(new CustomEvent(EVENEMENT_HORS_LIGNE, { detail: quoi }));
  return false;
}

export const messageHorsLigne = (quoi: string) => `Désolé, connectez-vous à internet pour accéder à ${quoi}.`;
