import { CRITERE_LABELS, CRITERES, type Climat, type Culture, type Rotation } from "@/lib/contract";
import type { Parcelle } from "@/lib/parcelle/validate";
import type { ClimatResume } from "./climat";
import { moisHorsSaison } from "./notes";
import type { Choix } from "./rotations";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const liste = (n: string[]) => (n.length <= 1 ? n.join("") : `${n.slice(0, -1).join(", ")} et ${n[n.length - 1]}`);

export function pourquoi(seq: Culture[], cl: ClimatResume): string[] {
  const phrases: string[] = [];
  seq.forEach((c, i) => {
    if (!c.legumineuse || seq.length < 2) return;
    const suivante = seq[(i + 1) % seq.length];
    if (!suivante.legumineuse) phrases.push(`${c.nom} capte l'azote de l'air et le laisse dans le sol pour ${suivante.nom}.`);
  });
  if (seq.length > 1 && seq.every((c, i) => c.famille !== seq[(i + 1) % seq.length].famille)) {
    phrases.push("Alterner les familles de plantes freine ravageurs et maladies.");
  }
  const assez = seq.filter((c) => c.eauMm[1] <= cl.pluieSaisonMm).map((c) => c.nom);
  if (assez.length) phrases.push(`La saison des pluies apporte environ ${cl.pluieSaisonMm} mm : assez pour ${liste(assez)}.`);
  if (seq.length === 1) phrases.push(`Cultiver ${seq[0].nom} chaque année épuise le sol et favorise ses ravageurs : une rotation l'éviterait.`);
  return phrases.length ? phrases : ["Aucun avantage particulier détecté par les règles pour cette suite de cultures."];
}

export function risques(seq: Culture[], cl: ClimatResume, p: Parcelle): string[] {
  const r: string[] = [];
  for (const c of seq) {
    if (p.eau === "pluie" && c.eauMm[0] > cl.pluieSaisonMm) {
      r.push(`${c.nom} risque de manquer d'eau : la saison apporte ${cl.pluieSaisonMm} mm pour un besoin d'au moins ${c.eauMm[0]} mm.`);
    }
    const hors = moisHorsSaison(c, cl);
    if (p.eau === "pluie" && hors > 1) r.push(`Le cycle de ${c.nom} dépasse la saison des pluies d'environ ${hors} mois.`);
    if (cl.tmaxSaison > 35 && c.chaleur <= 2) r.push(`${c.nom} supporte mal la chaleur : ${cl.tmaxSaison} °C en moyenne pendant la saison.`);
    if (p.materiel === "daba" && c.travailSol >= 4) r.push(`${c.nom} demande beaucoup de travail du sol pour un travail à la main.`);
  }
  return [...new Set(r)];
}

export function lacune(climat: Climat): string {
  const l = ["prix et demande au marché local non intégrés (revenu et marché estimés)", "pas de mesure du sol de la parcelle"];
  if (!climat.onglets.some((o) => o.id === "veg")) l.push("végétation (NDVI) pas encore branchée");
  return l.join(" ; ");
}

export function confiance(cl: ClimatResume): Rotation["confiance"] {
  const facteurs = { accordSources: 3, finesse: 1, historique: cl.annees >= 20 ? 5 : cl.annees >= 10 ? 4 : 2, verification: 1 } as const;
  const m = (facteurs.accordSources + facteurs.finesse + facteurs.historique + facteurs.verification) / 4;
  return { niveau: m >= 3.5 ? "élevée" : m >= 2.5 ? "moyenne" : "faible", facteurs };
}

/** Chaque année, la culture de la rotation est placée au début de la saison des pluies principale, le sol est nu ailleurs. */
export function calendrier(seq: Culture[], cl: ClimatResume): Rotation["calendrier"] {
  const out: Rotation["calendrier"] = [];
  for (const annee of [1, 2, 3]) {
    const c = seq[(annee - 1) % seq.length];
    const debut = cl.saison.debut;
    const fin = Math.min(12, debut + Math.ceil(c.cycleJours / 30) - 1);
    if (debut > 1) out.push({ annee, culture: "Sol nu", type: "sol_nu", debutMois: 1, finMois: debut - 1 });
    out.push({ annee, culture: c.nom, type: "culture", debutMois: debut, finMois: fin });
    if (fin < 12) out.push({ annee, culture: "Sol nu", type: "sol_nu", debutMois: fin + 1, finMois: 12 });
  }
  return out;
}

function note(scores: Rotation["scores"], recommandee: boolean): string {
  const forts = [...CRITERES].sort((a, b) => scores[b] - scores[a]).slice(0, 2).map((k) => CRITERE_LABELS[k].toLowerCase());
  return `Points forts : ${liste(forts)}.${recommandee ? " Meilleur score pour vos priorités." : ""}`;
}

export function construireRotation(ch: Choix, ctx: { climat: Climat; cl: ClimatResume; p: Parcelle; scoreActuelle: number }): Rotation & { score: number } {
  const { climat, cl, p } = ctx;
  const recommandee = ch.id === "B" && ch.score > ctx.scoreActuelle;
  const s = cl.saison;
  return {
    id: ch.id,
    tag: ch.id === "A" ? "Actuelle" : recommandee ? "Recommandée" : "Alternative",
    recommandee,
    sequence: ch.sequence,
    scores: ch.scores,
    score: ch.score,
    note: note(ch.scores, recommandee),
    pourquoi: pourquoi(ch.cultures, cl),
    donnees: [
      { source: "NASA POWER", texte: `Saison des pluies principale de ${MOIS[s.debut - 1]} à ${MOIS[s.fin - 1]} : ${cl.pluieSaisonMm} mm en moyenne${climat.meta ? ` (${climat.meta.periode})` : ""}.` },
      { source: "Fiches cultures", texte: "Besoins en eau et durée des cycles : FAO ECOCROP, valeurs à valider par l'agronome." },
    ],
    risques: risques(ch.cultures, cl, p),
    lacune: lacune(climat),
    confiance: confiance(cl),
    calendrier: calendrier(ch.cultures, cl),
  };
}
