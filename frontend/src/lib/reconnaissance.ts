/**
 * Moyens de transformer la voix en texte, du plus fiable au plus simple :
 * - « serveur » : la voix est enregistrée (WAV) et transcrite par un modèle audio (OpenRouter) ;
 * - « app » : la reconnaissance vocale du téléphone, dans l'app Android ;
 * - « navigateur » : la reconnaissance vocale du navigateur (Chrome).
 * Chacun donne une écoute qu'on termine pour obtenir le texte ("" si rien n'a été dit).
 */
import { demarrerEnregistrement, type Session } from "./enregistreur";
import { ecouterNatif, envoyerAuNatif } from "./modeApp";

export type CodeErreur = "refus" | "micro" | "reseau" | "ancienne" | "autre";
export class ErreurDictee extends Error {
  constructor(public code: CodeErreur) {
    super(code);
  }
}

export type Ecoute = { terminer: () => Promise<string>; annuler: () => void; surFin: (cb: () => void) => void };
export type Moteur = { nom: "serveur" | "app" | "navigateur"; demarrer: () => Promise<Ecoute> };
export type Enregistreur = () => Promise<Session>;

function erreurMicro(e: unknown): CodeErreur {
  const nom = (e as { name?: string })?.name ?? "";
  if (nom === "NotAllowedError" || nom === "SecurityError" || nom === "PermissionDeniedError") return "refus";
  if (nom === "NotFoundError" || nom === "OverconstrainedError" || nom === "NotReadableError") return "micro";
  return "autre";
}

export function moteurServeur(enregistrer: Enregistreur = demarrerEnregistrement): Moteur {
  return {
    nom: "serveur",
    demarrer: async () => {
      let session: Session;
      try {
        session = await enregistrer();
      } catch (e) {
        throw new ErreurDictee(erreurMicro(e));
      }
      return {
        surFin: () => undefined,
        annuler: () => session.annuler(),
        terminer: async () => {
          const audio = await session.arreter();
          const r = await fetch("/api/dictee", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio }) }).catch(() => null);
          const json = (await r?.json().catch(() => ({}))) as { texte?: string } | undefined;
          if (!r?.ok || typeof json?.texte !== "string") throw new ErreurDictee("autre");
          return json.texte.trim();
        },
      };
    },
  };
}

type Resultat = ArrayLike<{ transcript: string }> & { isFinal?: boolean };
type Reconnaissance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex?: number; results: ArrayLike<Resultat> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
export type ConstructeurReconnaissance = new () => Reconnaissance;

const CODE_NAVIGATEUR: Record<string, CodeErreur | "rien" | null> = {
  "not-allowed": "refus",
  "service-not-allowed": "refus",
  "audio-capture": "micro",
  network: "reseau",
  "no-speech": "rien",
  aborted: null,
};

export function moteurNavigateur(C: ConstructeurReconnaissance): Moteur {
  return {
    nom: "navigateur",
    demarrer: async () => {
      const r = new C();
      r.lang = "fr-FR";
      r.continuous = true;
      r.interimResults = false;
      const morceaux: string[] = [];
      let erreur: CodeErreur | null = null;
      let fini = false;
      let rappelFin: (() => void) | null = null;
      const attenteFin: (() => void)[] = [];
      r.onresult = (e) => {
        const res = Array.from(e.results);
        for (let i = e.resultIndex ?? 0; i < res.length; i++) {
          if (res[i].isFinal === false) continue;
          const t = res[i][0]?.transcript?.trim();
          if (t) morceaux[i] = t;
        }
      };
      r.onerror = (e) => {
        const code = e?.error ? CODE_NAVIGATEUR[e.error] : "autre";
        if (code && code !== "rien") erreur = code;
        else if (code === undefined) erreur = "autre";
      };
      r.onend = () => {
        if (fini) return;
        fini = true;
        attenteFin.splice(0).forEach((f) => f());
        rappelFin?.();
      };
      try {
        r.start();
      } catch {
        throw new ErreurDictee("autre");
      }
      const resultat = () => {
        if (erreur) throw new ErreurDictee(erreur);
        return morceaux.filter(Boolean).join(" ").trim().slice(0, 300);
      };
      return {
        surFin: (cb) => {
          rappelFin = cb;
        },
        annuler: () => {
          fini = true;
          try {
            (r.abort ?? r.stop).call(r);
          } catch {
            /* déjà arrêtée */
          }
        },
        terminer: async () => {
          if (!fini) {
            await new Promise<void>((ok) => {
              attenteFin.push(ok);
              try {
                r.stop();
              } catch {
                ok();
              }
              setTimeout(ok, 3000);
            });
          }
          return resultat();
        },
      };
    },
  };
}

export function moteurApp(): Moteur {
  return {
    nom: "app",
    demarrer: async () => {
      let rappelFin: (() => void) | null = null;
      let arret = () => undefined as void;
      const reponse = new Promise<string>((ok, ko) => {
        // Une app trop ancienne ne répond pas : on ne reste pas bloqué.
        const delai = setTimeout(() => ko(new ErreurDictee("ancienne")), 25_000);
        const desabonner = ecouterNatif((m) => {
          if (m.type !== "dictee") return;
          clearTimeout(delai);
          desabonner();
          if ("texte" in m) ok(m.texte);
          else if (m.erreur === "rien") ok("");
          else ko(new ErreurDictee(m.erreur === "refus" ? "refus" : "autre"));
          rappelFin?.();
        });
        arret = () => {
          clearTimeout(delai);
          desabonner();
        };
      });
      reponse.catch(() => rappelFin?.());
      envoyerAuNatif({ type: "dicter" });
      return {
        surFin: (cb) => {
          rappelFin = cb;
        },
        annuler: arret,
        terminer: () => reponse,
      };
    },
  };
}
