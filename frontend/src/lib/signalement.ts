/**
 * Vigilance communautaire : l'agriculteur prévient ses voisins (groupe WhatsApp du village, coopérative) d'un
 * ravageur, d'une maladie suspectée ou d'un aléa. Pas de serveur, pas de compte : seuls la région, la date, le type et
 * une note courte partent, et l'historique reste sur le téléphone.
 */
const CLE = "forosat.signalements";
export const TYPES = {
  ravageurs: { libelle: "Ravageurs", conseil: "Inspectez vos champs, surtout les jeunes plants." },
  maladie: { libelle: "Maladie suspectée", conseil: "Comparez avec vos plants et demandez l'avis d'un conseiller agricole avant tout traitement." },
  inondation: { libelle: "Inondation", conseil: "Vérifiez le drainage de vos parcelles basses." },
  secheresse: { libelle: "Sécheresse", conseil: "Paillez le sol et retardez les semis si la terre est sèche." },
  feu: { libelle: "Feu de brousse", conseil: "Dégagez un pare-feu autour des champs et des greniers." },
  autre: { libelle: "Autre aléa", conseil: "Restez attentifs dans vos champs." },
} as const;
export type TypeSignalement = keyof typeof TYPES;
export type Signal = { type: TypeSignalement; note: string; region: string; date: string };

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const dateLongue = (iso: string) => {
  const [a, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
};

export function texteSignalement(s: Signal): string {
  const t = TYPES[s.type];
  return [
    `ForoSat · Vigilance ${s.region}`,
    `${dateLongue(s.date)} : ${t.libelle}${s.note ? ` — ${s.note}` : ""}`,
    t.conseil,
    "Signalement d'un agriculteur, non vérifié.",
  ].join("\n");
}

export const lienWhatsapp = (s: Signal) => `https://wa.me/?text=${encodeURIComponent(texteSignalement(s))}`;

export function lireSignalements(): Signal[] {
  try {
    const l = JSON.parse(localStorage.getItem(CLE) ?? "[]");
    return Array.isArray(l) ? l.filter((s) => s && s.type in TYPES) : [];
  } catch {
    return [];
  }
}

export function ajouterSignalement(s: Signal): Signal[] {
  if (!(s.type in TYPES) || s.note.length > 200) throw new Error("Signalement invalide");
  const l = [s, ...lireSignalements()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
  try {
    localStorage.setItem(CLE, JSON.stringify(l));
  } catch {
    /* stockage indisponible */
  }
  return l;
}
