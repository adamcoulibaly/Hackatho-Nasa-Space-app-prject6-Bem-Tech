/**
 * Limiteur simple par clé (adresse IP) sur une fenêtre glissante. En mémoire : propre à chaque instance du serveur,
 * il freine un script qui épuiserait le quota gratuit du modèle d'IA, sans base de données.
 */
export function limiteur({ max, fenetreMs }: { max: number; fenetreMs: number }) {
  const appels = new Map<string, number[]>();
  return (cle: string, maintenant = Date.now()): boolean => {
    const recents = (appels.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs);
    if (recents.length >= max) {
      appels.set(cle, recents);
      return false;
    }
    recents.push(maintenant);
    appels.set(cle, recents);
    if (appels.size > 5000) for (const [k, v] of appels) if (v.every((t) => maintenant - t >= fenetreMs)) appels.delete(k);
    return true;
  };
}

/** Vrai si la requête vient d'une page du site lui-même (ou n'annonce pas d'origine, comme l'app native). */
export function memeOrigine(req: Request): boolean {
  const origine = req.headers.get("origin");
  if (!origine) return true;
  try {
    return new URL(origine).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host);
  } catch {
    return false;
  }
}

export const adresse = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "inconnue";
