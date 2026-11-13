/**
 * Calendrier agricole d'une culture : de la préparation du sol au post-récolte, daté à partir de la date de semis
 * (réelle si l'agriculteur la donne, sinon la date médiane observée dans la région sur 2005–2025) et des stades FAO-56
 * de la culture. Conseils écrits, à valider par l'agronome.
 */
import type { Culture, Saisons } from "@/lib/contract";

export type EtapeId = "preparation" | "semis" | "levee" | "entretien" | "floraison" | "maturation" | "recolte" | "post_recolte";
export type Etape = { id: EtapeId; label: string; debut: string; fin: string; conseil: string };

const JOUR = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const ajouter = (date: string, jours: number) => iso(Date.parse(`${date}T00:00:00Z`) + jours * JOUR);

/** Date de semis habituelle : médiane des semis réellement observés pour cette culture, ou estimation en début de saison. */
export function semisHabituel(
  s: Saisons | null,
  culture: string,
  annee: number,
  saison?: { debut: number; fin: number },
): { date: string; source: "mesure" | "estimation" } {
  const principale = !saison || (s && saison.debut === s.meta.saison.debut);
  // Médiane des jours « mois-jour » (et non du rang dans l'année, décalé d'un jour les années bissextiles).
  const moisJours = principale ? (s?.cultures[culture] ?? []).filter((v) => v.semis).map((v) => v.semis!.slice(5)).sort() : [];
  if (moisJours.length) return { date: `${annee}-${moisJours[Math.floor((moisJours.length - 1) / 2)]}`, source: "mesure" };
  const debut = saison?.debut ?? s?.meta.saison.debut ?? 5;
  return { date: `${annee}-${String(debut).padStart(2, "0")}-15`, source: "estimation" };
}

function stades(c: Culture): [number, number, number, number] {
  const ref = c.stades.jours;
  const total = ref.reduce((a, b) => a + b, 0);
  const d = ref.slice(0, 3).map((x) => Math.round((x * c.cycleJours) / total));
  return [d[0], d[1], d[2], c.cycleJours - d[0] - d[1] - d[2]];
}

export function calendrierCulture(c: Culture, semis: string): Etape[] {
  const [ini, dev, mid] = stades(c);
  const nom = c.nom.toLowerCase();
  const legumineuse = c.legumineuse;
  const etape = (id: EtapeId, label: string, deb: number, fin: number, conseil: string): Etape => ({ id, label, debut: ajouter(semis, deb), fin: ajouter(semis, Math.max(deb, fin)), conseil });
  return [
    etape("preparation", "Préparation du sol", -21, -1, `Nettoyez la parcelle, laissez les résidus en paillage plutôt que de brûler, et préparez le sol${c.travailSol >= 4 ? " (buttes ou billons pour cette culture)" : ""}.`),
    etape("semis", "Semis", 0, 6, `Semez le ${nom} après une pluie d'au moins 20 mm en 3 jours, quand le sol est humide en profondeur.`),
    etape("levee", "Levée", 7, ini - 1, "Vérifiez la levée ; ressemez les trous vides dans la semaine si la levée est irrégulière."),
    etape("entretien", "Croissance et entretien", ini, ini + dev - 1, `Premier sarclage vers 3 semaines, second vers 6 semaines${legumineuse ? "" : " ; apport d'engrais ou de fumure si vous en avez"}. Surveillez les ravageurs.`),
    etape("floraison", "Floraison", ini + dev, ini + dev + mid - 1, "Période la plus sensible au manque d'eau : paillez, et surveillez les poches sèches dans les alertes."),
    etape("maturation", "Maturation", ini + dev + mid, c.cycleJours - 1, "Limitez les passages dans le champ ; préparez le séchage et le stockage."),
    etape("recolte", "Récolte", c.cycleJours, c.cycleJours + 13, "Récoltez par temps sec, quand la culture est mûre ; notez votre récolte dans le carnet."),
    etape("post_recolte", "Après la récolte", c.cycleJours + 14, c.cycleJours + 44, "Séchez et stockez à l'abri ; laissez les résidus sur le sol pour le protéger jusqu'à la culture suivante."),
  ];
}

/** Étape en cours à une date (AAAA-MM-JJ), ou null avant la préparation et après le post-récolte. */
export function etapeDuJour(etapes: Etape[], date: string): Etape | null {
  return etapes.find((e) => date >= e.debut && date <= e.fin) ?? null;
}
