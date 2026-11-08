/** État de semis du moment, à partir des pluies NASA POWER des derniers jours (règle de début des pluies de Sivakumar). */

export type EtatSemis = "seche" | "premieres_pluies" | "fenetre_ouverte" | "poche_seche";
export type Jour = { date: string; pluie: number | null };

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const SEUIL_MM = 20;
const SEC_MM = 1;
const POCHE_JOURS = 7;
const RECENT_JOURS = 10;

const dateLisible = (iso: string) => {
  const [, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]}`;
};

export function etatSemis(jours: Jour[], saison: { debut: number; fin: number }): { etat: EtatSemis; depuis?: string; message: string } {
  const valides = jours.filter((j) => j.pluie !== null) as { date: string; pluie: number }[];
  const attendue = `Saison sèche : pluies attendues vers ${MOIS[saison.debut - 1]}.`;
  const dernier = valides.at(-1);
  if (!dernier) return { etat: "seche", message: attendue };
  // Hors de la saison principale (un mois d'avance toléré), un orage ne rouvre pas la fenêtre de semis.
  const mois = Number(dernier.date.slice(5, 7));
  if (mois < saison.debut - 1 || mois > saison.fin) return { etat: "seche", message: attendue };

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
        return { etat: "poche_seche", depuis: debut, message: `Poche sèche depuis le ${dateLisible(debut)} : attendez la reprise des pluies avant de semer.` };
      }
    }
    const depuis = valides[ouverture].date;
    return { etat: "fenetre_ouverte", depuis, message: `Pluies installées depuis le ${dateLisible(depuis)} : c'est le moment de semer.` };
  }
  if (valides.slice(-RECENT_JOURS).some((j) => j.pluie >= SEC_MM)) {
    return { etat: "premieres_pluies", message: "Premières pluies : attendez qu'elles s'installent avant de semer." };
  }
  return { etat: "seche", message: attendue };
}
