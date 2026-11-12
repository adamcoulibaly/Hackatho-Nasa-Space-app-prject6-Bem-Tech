/**
 * Alertes agricoles à partir de la pluie NASA POWER des 30 derniers jours : sécheresse en saison, fortes pluies,
 * indice de risque (faible, moyen, élevé) et conseil pratique. Seuils écrits, à valider par l'agronome.
 */
import type { Jour } from "./etat-semis";

export type Niveau = "faible" | "moyen" | "eleve";
export type Alerte = { type: "secheresse" | "fortes_pluies"; niveau: Exclude<Niveau, "faible">; depuis: string; message: string; conseil: string };

const SEC_MM = 1;
const SECHERESSE = { moyen: 10, eleve: 15 };
const PLUIE_JOUR = { moyen: 50, eleve: 80 };
const PLUIE_3J = { moyen: 100, eleve: 150 };
const FENETRE_PLUIE = 7;
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const jourLisible = (iso: string) => {
  const [, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]}`;
};

export function alertesMeteo(jours: Jour[], saisons: { debut: number; fin: number }[]): { risque: Niveau; alertes: Alerte[] } {
  // Les jours sans mesure ne comptent ni comme secs ni comme pluvieux.
  const valides = jours.filter((j) => j.pluie !== null) as { date: string; pluie: number }[];
  const alertes: Alerte[] = [];
  const dernier = valides.at(-1);
  if (!dernier) return { risque: "faible", alertes };

  const mois = Number(dernier.date.slice(5, 7));
  if (saisons.some((s) => mois >= s.debut && mois <= s.fin)) {
    let sec = 0;
    for (let i = valides.length - 1; i >= 0 && valides[i].pluie < SEC_MM; i--) sec++;
    if (sec >= SECHERESSE.moyen) {
      const depuis = valides[valides.length - sec].date;
      alertes.push({
        type: "secheresse",
        niveau: sec >= SECHERESSE.eleve ? "eleve" : "moyen",
        depuis,
        message: `Sécheresse : ${sec} jours sans pluie utile depuis le ${jourLisible(depuis)}.`,
        conseil: "Paillez le sol pour garder l'humidité, retardez les semis et apportez de l'eau aux jeunes plants si vous le pouvez.",
      });
    }
  }

  const recents = valides.slice(-FENETRE_PLUIE);
  let pire: { niveau: "moyen" | "eleve"; depuis: string; mm: number; jours: number } | null = null;
  recents.forEach((j, i) => {
    const trois = recents.slice(Math.max(0, i - 2), i + 1);
    const cumul = trois.reduce((s, x) => s + x.pluie, 0);
    const niveau = j.pluie >= PLUIE_JOUR.eleve || cumul >= PLUIE_3J.eleve ? "eleve" : j.pluie >= PLUIE_JOUR.moyen || cumul >= PLUIE_3J.moyen ? "moyen" : null;
    if (!niveau) return;
    const surTrois = j.pluie < PLUIE_JOUR.moyen || cumul >= PLUIE_3J.eleve;
    const candidat = { niveau, depuis: surTrois ? trois[0].date : j.date, mm: Math.round(surTrois ? cumul : j.pluie), jours: surTrois ? trois.length : 1 } as const;
    if (!pire || (candidat.niveau === "eleve" && pire.niveau === "moyen") || (candidat.niveau === pire.niveau && candidat.mm > pire.mm)) pire = candidat;
  });
  if (pire) {
    const p = pire as { niveau: "moyen" | "eleve"; depuis: string; mm: number; jours: number };
    alertes.push({
      type: "fortes_pluies",
      niveau: p.niveau,
      depuis: p.depuis,
      message: `Fortes pluies : ${p.mm} mm ${p.jours > 1 ? `en ${p.jours} jours` : "en un jour"} depuis le ${jourLisible(p.depuis)}.`,
      conseil: "Dégagez les rigoles de drainage, évitez de travailler un sol gorgé d'eau et protégez les pentes du ruissellement et de l'érosion (paillage, couverture).",
    });
  }
  const risque: Niveau = alertes.some((a) => a.niveau === "eleve") ? "eleve" : alertes.length ? "moyen" : "faible";
  return { risque, alertes };
}
