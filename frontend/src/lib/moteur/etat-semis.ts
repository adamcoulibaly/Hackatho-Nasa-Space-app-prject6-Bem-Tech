/** État de semis du moment, à partir des pluies NASA POWER des derniers jours (règle de début des pluies de Sivakumar). */

export type EtatSemis = "seche" | "premieres_pluies" | "fenetre_ouverte" | "poche_seche" | "en_saison";
export type Jour = { date: string; pluie: number | null; tmax?: number | null };

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const SEUIL_MM = 20;
const SEC_MM = 1;
const POCHE_JOURS = 7;
const RECENT_JOURS = 10;

const dateLisible = (iso: string) => {
  const [, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]}`;
};

type Saison = { debut: number; fin: number };

/** Mois de début de la prochaine saison après le mois donné (le sud en a deux). */
function prochainDebut(saisons: Saison[], mois: number): number {
  const debuts = saisons.map((s) => s.debut).sort((a, b) => a - b);
  return debuts.find((d) => d > mois) ?? debuts[0];
}

/** `saisons` : toutes les saisons des pluies de la région (une au nord, deux au sud). */
/** Mois après le début de saison pendant lesquels on cherche encore le semis (comme le moteur du pipeline : début → début + 2). */
const FENETRE_MOIS = 2;

/**
 * `cle` identifie la saison (année et mois de début) : l'app n'alerte qu'une fois par saison et par état.
 * Après la fenêtre de semis, la saison est « en cours » : plus aucun conseil de semer.
 */
export function etatSemis(jours: Jour[], saisons: Saison | Saison[]): { etat: EtatSemis; depuis?: string; message: string; cle?: string } {
  const liste = Array.isArray(saisons) ? saisons : [saisons];
  const valides = jours.filter((j) => j.pluie !== null) as { date: string; pluie: number }[];
  const dernier = valides.at(-1);
  const mois = dernier ? Number(dernier.date.slice(5, 7)) : 0;
  const attendue = `Saison sèche : pluies attendues vers ${MOIS[prochainDebut(liste, mois) - 1]}.`;
  if (!dernier) return { etat: "seche", message: attendue };
  // Hors de toute saison des pluies (un mois d'avance toléré), un orage ne rouvre pas la fenêtre de semis.
  const saison = liste.find((s) => mois >= s.debut - 1 && mois <= s.fin);
  if (!saison) return { etat: "seche", message: attendue };
  const cle = `${dernier.date.slice(0, 4)}-${saison.debut}`;
  if (mois > saison.debut + FENETRE_MOIS) {
    return {
      etat: "en_saison",
      cle,
      message: "Saison des pluies en cours : la fenêtre de semis est passée. Pour un semis tardif, préférez une culture courte (niébé, arachide).",
    };
  }

  const cumul = (i: number) => valides.slice(Math.max(0, i - 2), i + 1).reduce((s, j) => s + j.pluie, 0);
  let ouverture = -1;
  for (let i = valides.length - 1; i >= 0; i--) {
    if (cumul(i) >= SEUIL_MM) {
      ouverture = i;
      while (ouverture > 0 && cumul(ouverture - 1) >= SEUIL_MM) ouverture--;
      break;
    }
  }
  if (ouverture >= 0) {
    let sec = 0;
    for (let i = ouverture + 1; i < valides.length; i++) {
      sec = valides[i].pluie < SEC_MM ? sec + 1 : 0;
      if (sec >= POCHE_JOURS) {
        const debut = valides[i - sec + 1].date;
        return { etat: "poche_seche", depuis: debut, cle, message: `Poche sèche depuis le ${dateLisible(debut)} : attendez la reprise des pluies avant de semer.` };
      }
    }
    const depuis = valides[ouverture].date;
    return { etat: "fenetre_ouverte", depuis, cle, message: `Pluies installées depuis le ${dateLisible(depuis)} : c'est le moment de semer.` };
  }
  if (valides.slice(-RECENT_JOURS).some((j) => j.pluie >= SEC_MM)) {
    return { etat: "premieres_pluies", cle, message: "Premières pluies : attendez qu'elles s'installent avant de semer." };
  }
  return { etat: "seche", message: attendue };
}
