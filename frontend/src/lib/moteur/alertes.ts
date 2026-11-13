/**
 * Alertes agricoles à partir de la pluie NASA POWER des 30 derniers jours : sécheresse en saison, fortes pluies,
 * indice de risque (faible, moyen, élevé) et conseil pratique. Seuils écrits, à valider par l'agronome.
 */
import type { Jour } from "./etat-semis";

export type Niveau = "faible" | "moyen" | "eleve";
export type Alerte = { type: "secheresse" | "fortes_pluies" | "chaleur"; niveau: Exclude<Niveau, "faible">; depuis: string; message: string; conseil: string };

const SEC_MM = 1;
const SECHERESSE = { moyen: 10, eleve: 15 };
const PLUIE_JOUR = { moyen: 50, eleve: 80 };
const PLUIE_3J = { moyen: 100, eleve: 150 };
const FENETRE_PLUIE = 7;
const CHALEUR = { moyen: 38, eleve: 40, jours: 3 };
const PLUIE_DEBUT_SAISON = 10;
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
  const saison = saisons.find((s) => mois >= s.debut && mois <= s.fin);
  if (saison) {
    // La sécheresse ne se compte qu'après le vrai début de la saison (une première pluie d'au moins 10 mm depuis
    // le 1er du mois de début) : le temps sec normal d'avant-saison n'est pas une alerte.
    const debutSaison = `${dernier.date.slice(0, 4)}-${String(saison.debut).padStart(2, "0")}-01`;
    const iDebut = valides.findIndex((j) => j.date >= debutSaison && j.pluie >= PLUIE_DEBUT_SAISON);
    let sec = 0;
    for (let i = valides.length - 1; iDebut >= 0 && i > iDebut && valides[i].pluie < SEC_MM; i--) sec++;
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

  // Chaleur : au moins 3 jours de suite à 38 °C ou plus (température maximale de l'air) cette semaine, cultures en place.
  if (saison) {
    const semaine = jours.slice(-FENETRE_PLUIE).filter((j) => j.tmax != null) as { date: string; tmax: number }[];
    let run: { date: string; tmax: number }[] = [];
    let meilleur: typeof run = [];
    for (const j of semaine) {
      run = j.tmax >= CHALEUR.moyen ? [...run, j] : [];
      if (run.length >= meilleur.length) meilleur = run;
    }
    if (meilleur.length >= CHALEUR.jours) {
      const max = Math.max(...meilleur.map((j) => j.tmax));
      alertes.push({
        type: "chaleur",
        niveau: meilleur.filter((j) => j.tmax >= CHALEUR.eleve).length >= CHALEUR.jours ? "eleve" : "moyen",
        depuis: meilleur[0].date,
        message: `Forte chaleur : ${meilleur.length} jours à 38 °C ou plus depuis le ${jourLisible(meilleur[0].date)} (jusqu'à ${Math.round(max)} °C).`,
        conseil: "Paillez le sol, travaillez et arrosez tôt le matin ou en fin de journée, évitez les traitements aux heures chaudes.",
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
