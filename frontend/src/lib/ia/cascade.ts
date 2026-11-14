/**
 * Appel à une liste de modèles (OpenRouter, compatible OpenAI) sans longue attente :
 * - le premier modèle est lancé ; s'il échoue, le suivant part aussitôt ;
 * - s'il est lent, le suivant est lancé en relais après `relanceMs` (au plus 3 en même temps) ;
 * - la première réponse valide gagne et annule les autres ; tout s'arrête après `totalMs`.
 * Le dernier modèle qui a répondu passe en premier la fois suivante (mémoire de l'instance serveur).
 */
/** `credit` : le compte OpenRouter n'a pas le solde demandé (HTTP 402, ex. 0,50 $ minimum pour l'audio). */
export type Essai = { ok: true; texte: string; modele: string } | { ok: false; sature: boolean; credit: boolean };

const prefere = new Map<string, string>();
const EN_PARALLELE = 3;

export async function enCascade(o: {
  famille: string;
  modeles: string[];
  url: string;
  cle: string;
  fetch: typeof fetch;
  corps: (modele: string) => object;
  /** Texte de la réponse → texte retenu, ou null si la réponse ne convient pas. Par défaut : texte non vide. */
  valider?: (texte: string) => string | null;
  relanceMs?: number;
  totalMs?: number;
}): Promise<Essai> {
  const valider = o.valider ?? ((t: string) => t.trim() || null);
  const favori = prefere.get(o.famille);
  const file = favori && o.modeles.includes(favori) ? [favori, ...o.modeles.filter((m) => m !== favori)] : [...o.modeles];
  if (!file.length) return { ok: false, sature: false, credit: false };

  const essayer = async (modele: string, signal: AbortSignal): Promise<string | null | "sature" | "credit"> => {
    try {
      const r = await o.fetch(o.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${o.cle}`, "Content-Type": "application/json", "X-Title": "ForoSat" },
        body: JSON.stringify(o.corps(modele)),
        signal,
      });
      if (!r.ok) {
        const extrait = (await r.text().catch(() => "")).slice(0, 300);
        console.warn(`[ia] ${modele} : HTTP ${r.status} ${extrait}`);
        return r.status === 429 ? "sature" : r.status === 402 ? "credit" : null;
      }
      const json = (await r.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[] };
      const brut = json.choices?.[0]?.message?.content ?? "";
      const texte = valider(brut);
      if (texte === null) console.warn(`[ia] ${modele} : réponse inutilisable (fin : ${json.choices?.[0]?.finish_reason ?? "inconnue"})`);
      return texte;
    } catch (e) {
      if (!signal.aborted) console.warn(`[ia] ${modele} : ${e instanceof Error ? e.message : "erreur"}`);
      return null;
    }
  };

  return new Promise<Essai>((resoudre) => {
    const controles = new Set<AbortController>();
    let enVol = 0;
    let fini = false;
    let sature = false;
    let credit = false;
    const terminer = (r: Essai) => {
      if (fini) return;
      fini = true;
      clearInterval(relais);
      clearTimeout(limite);
      controles.forEach((c) => c.abort());
      resoudre(r);
    };
    const lancer = () => {
      const modele = file.shift();
      if (!modele) return;
      enVol++;
      const c = new AbortController();
      controles.add(c);
      essayer(modele, c.signal).then((t) => {
        enVol--;
        controles.delete(c);
        if (fini) return;
        if (t === "sature") sature = true;
        else if (t === "credit") credit = true;
        else if (t !== null) {
          prefere.set(o.famille, modele);
          return terminer({ ok: true, texte: t, modele });
        }
        if (file.length) lancer();
        else if (enVol === 0) terminer({ ok: false, sature, credit });
      });
    };
    const relais = setInterval(() => {
      if (file.length && enVol < EN_PARALLELE) lancer();
    }, o.relanceMs ?? 5000);
    const limite = setTimeout(() => terminer({ ok: false, sature, credit }), o.totalMs ?? 25_000);
    lancer();
  });
}
