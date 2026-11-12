/**
 * Simulateur : les rotations comparées sur 3, 5 ou 10 ans, à partir des saisons réellement mesurées (NASA POWER,
 * moteur FAO-56 du pipeline). Trois scénarios : les dernières saisons réelles, la saison la plus sèche répétée,
 * la saison la plus pluvieuse répétée. Fertilité et couverture du sol suivent des règles écrites ; le revenu reste une hypothèse.
 */
import type { Culture, Saisons, VerdictSaison } from "@/lib/contract";
import { rendementRelatif } from "./rejeu";

export type Scenario = "reel" | "sec" | "pluvieux";
export type Duree = 1 | 3 | 5 | 10;

export type AnneeSimulee = {
  annee: number;
  anneeSource: number;
  /** Vrai si la saison de cette culture manquait et qu'on a pris la plus proche. */
  remplacee: boolean;
  culture: string;
  verdict: VerdictSaison["verdict"];
  semis: string | null;
  cause: string;
  rendement: number;
  fertilite: number;
  couvertureMois: number;
};

export type Simulation = {
  scenario: Scenario;
  annees: AnneeSimulee[];
  bonnes: number;
  rendementMoyen: number;
  fertiliteFinale: number;
  tendanceFertilite: "s'enrichit" | "stable" | "s'appauvrit";
  couvertureMoyenne: number;
  revenu: { note: number; hypothese: true };
  avertissements: string[];
};

const DERNIERE_ANNEE = 2025;

/** Saison la plus sèche et la plus pluvieuse, d'après la pluie mesurée de la saison principale. */
export function anneesExtremes(s: Saisons): { seche: number; pluvieuse: number } {
  const pluies = Object.entries(s.meta.pluieSaison ?? {}).map(([a, mm]) => [Number(a), mm] as const);
  if (pluies.length) {
    const tri = [...pluies].sort((a, b) => a[1] - b[1]);
    return { seche: tri[0][0], pluvieuse: tri[tri.length - 1][0] };
  }
  // Sans pluie mesurée : la moyenne des rapports eau reçue / demandée sur toutes les cultures.
  const parAnnee = new Map<number, number[]>();
  for (const v of Object.values(s.cultures).flat()) parAnnee.set(v.annee, [...(parAnnee.get(v.annee) ?? []), v.ratio ?? 0]);
  const moy = [...parAnnee].map(([a, r]) => [a, r.reduce((x, y) => x + y, 0) / r.length] as const).sort((a, b) => a[1] - b[1]);
  return { seche: moy[0][0], pluvieuse: moy[moy.length - 1][0] };
}

/** Saison d'une culture une année donnée, ou la plus proche disponible. */
function saisonDe(s: Saisons, culture: string, annee: number): { v: VerdictSaison; remplacee: boolean } | null {
  const liste = s.cultures[culture] ?? [];
  const exacte = liste.find((x) => x.annee === annee);
  if (exacte) return { v: exacte, remplacee: false };
  const proche = [...liste].sort((a, b) => Math.abs(a.annee - annee) - Math.abs(b.annee - annee))[0];
  return proche ? { v: proche, remplacee: true } : null;
}

const moisCouverts = (c: Culture) => Math.min(12, Math.ceil(c.cycleJours / 30));

export function simuler(sequence: string[], s: Saisons, cultures: Culture[], n: Duree, scenario: Scenario): Simulation {
  const fiches = new Map(cultures.map((c) => [c.nom, c]));
  const extremes = anneesExtremes(s);
  const annees: AnneeSimulee[] = [];
  let fertilite = 0;
  for (let i = 0; i < n; i++) {
    const nom = sequence[i % sequence.length];
    const fiche = fiches.get(nom);
    const source = scenario === "sec" ? extremes.seche : scenario === "pluvieux" ? extremes.pluvieuse : DERNIERE_ANNEE - n + 1 + i;
    const saison = saisonDe(s, nom, source);
    if (!fiche || !saison) continue;
    // Règles de fertilité : une légumineuse fixe l'azote (+1), une autre culture en consomme (−0,5),
    // et la même famille deux ans de suite favorise maladies et épuisement (−0,5).
    fertilite += fiche.legumineuse ? 1 : -0.5;
    const precedente = i > 0 ? fiches.get(sequence[(i - 1) % sequence.length]) : undefined;
    if (precedente && precedente.famille === fiche.famille) fertilite -= 0.5;
    annees.push({
      annee: i + 1,
      anneeSource: saison.v.annee,
      remplacee: saison.remplacee,
      culture: nom,
      verdict: saison.v.verdict,
      semis: saison.v.semis,
      cause: saison.v.cause,
      rendement: rendementRelatif(saison.v.ratio, fiche.ky.valeur),
      fertilite,
      couvertureMois: moisCouverts(fiche),
    });
  }
  const moyenne = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0);
  const notesRevenu = annees.map((a) => fiches.get(a.culture)!.revenu);
  const avertissements: string[] = [];
  if (scenario === "sec") avertissements.push(`Chaque année rejoue la saison la plus sèche mesurée (${extremes.seche}, ${s.meta.pluieSaison?.[extremes.seche] ?? "?"} mm).`);
  if (scenario === "pluvieux") {
    avertissements.push(`Chaque année rejoue la saison la plus pluvieuse mesurée (${extremes.pluvieuse}, ${s.meta.pluieSaison?.[extremes.pluvieuse] ?? "?"} mm).`);
    const peuCouvrantes = [...new Set(sequence)].filter((c) => (fiches.get(c)?.couverture ?? 5) <= 2);
    if (peuCouvrantes.length) avertissements.push(`Fortes pluies : ${peuCouvrantes.join(", ")} couvre peu le sol, risque d'érosion. Paillez ou associez une culture couvrante.`);
    avertissements.push("Le modèle ne simule pas l'excès d'eau (inondation, lessivage) : seule la sécheresse est calculée.");
  }
  if (annees.some((a) => a.remplacee)) avertissements.push("Certaines saisons manquaient pour une culture : la saison mesurée la plus proche est utilisée.");
  return {
    scenario,
    annees,
    bonnes: annees.filter((a) => a.verdict === "bonne").length,
    rendementMoyen: Math.round(moyenne(annees.map((a) => a.rendement))),
    fertiliteFinale: fertilite,
    tendanceFertilite: fertilite > 1 ? "s'enrichit" : fertilite < -1 ? "s'appauvrit" : "stable",
    couvertureMoyenne: Math.round((moyenne(annees.map((a) => a.couvertureMois)) / 12) * 100),
    revenu: { note: Math.round(moyenne(notesRevenu) * 10) / 10, hypothese: true },
    avertissements,
  };
}

export type Stade = "sol_nu" | "levee" | "croissance" | "floraison" | "maturite";
export type EtatJour = { culture: string | null; stade: Stade; etat: string };

/** Durées des 4 stades FAO-56 ramenées au cycle de la fiche (comme le pipeline). */
function stades(c: Culture): number[] {
  const ref = c.stades.jours;
  const total = ref.reduce((a, b) => a + b, 0);
  const d = ref.slice(0, 3).map((x) => Math.round((x * c.cycleJours) / total));
  return [...d, c.cycleJours - d.reduce((a, b) => a + b, 0)];
}

const ETAT = { bonne: "bonne croissance", difficile: "stress hydrique", perdue: "récolte compromise" } as const;

/** Culture, stade et état d'une année simulée à un jour de l'année (1 à 365) : base du simulateur visuel. */
export function etatAuJour(sim: Simulation, cultures: Culture[], annee: number, jour: number): EtatJour {
  const a = sim.annees.find((x) => x.annee === annee);
  const fiche = a && cultures.find((c) => c.nom === a.culture);
  if (!a || !fiche) return { culture: null, stade: "sol_nu", etat: "sol nu" };
  if (!a.semis) return { culture: a.culture, stade: "sol_nu", etat: "pas de semis possible" };
  const [an, m, j] = a.semis.split("-").map(Number);
  const jourSemis = Math.round((Date.UTC(an, m - 1, j) - Date.UTC(an, 0, 1)) / 86_400_000) + 1;
  const d = jour - jourSemis;
  const [ini, dev, mid, fin] = stades(fiche);
  if (d < 0 || d >= ini + dev + mid + fin) return { culture: d < 0 ? null : a.culture, stade: "sol_nu", etat: d < 0 ? "sol nu (avant le semis)" : "sol nu (après la récolte)" };
  const stade: Stade = d < ini ? "levee" : d < ini + dev ? "croissance" : d < ini + dev + mid ? "floraison" : "maturite";
  return { culture: a.culture, stade, etat: ETAT[a.verdict] };
}
