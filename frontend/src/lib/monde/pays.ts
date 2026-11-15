/**
 * Cultures proposées selon le pays de la parcelle. Les listes suivent les grandes cultures annuelles de chaque zone
 * (FAOSTAT, superficies récoltées), à affiner avec les agronomes de chaque pays. Toutes les cultures du catalogue
 * restent choisissables : la liste du pays vient d'abord.
 */

/** Les 8 cultures historiques de ForoSat (Côte d'Ivoire) : l'ordre et la liste ne changent pas. */
export const CULTURES_CI = ["Maïs", "Coton", "Igname", "Manioc", "Arachide", "Riz", "Sorgho", "Niébé"] as const;

/** Catalogue complet (mêmes noms que knowledge/cultures.json). */
export const CATALOGUE = [
  ...CULTURES_CI,
  "Mil", "Fonio", "Blé", "Orge", "Soja", "Haricot", "Pois chiche", "Pomme de terre", "Patate douce", "Sésame", "Tournesol",
] as const;
export type NomCulture = (typeof CATALOGUE)[number];

const ZONES: Record<string, { nom: string; cultures: NomCulture[]; pays: string[] }> = {
  sahel: {
    nom: "Sahel",
    cultures: ["Mil", "Sorgho", "Niébé", "Arachide", "Maïs", "Riz", "Sésame", "Fonio", "Coton", "Manioc"],
    pays: ["SN", "ML", "BF", "NE", "TD", "MR", "GM", "GW", "CV"],
  },
  golfe: {
    nom: "Golfe de Guinée",
    cultures: ["Maïs", "Manioc", "Igname", "Riz", "Arachide", "Niébé", "Sorgho", "Soja", "Coton", "Patate douce", "Mil"],
    pays: ["GH", "TG", "BJ", "NG", "LR", "SL"],
  },
  guinee: { nom: "Guinée", cultures: ["Riz", "Manioc", "Maïs", "Fonio", "Arachide", "Mil", "Patate douce", "Niébé", "Igname"], pays: ["GN"] },
  centre: {
    nom: "Afrique centrale",
    cultures: ["Maïs", "Manioc", "Arachide", "Haricot", "Sorgho", "Mil", "Riz", "Patate douce", "Igname", "Soja", "Pomme de terre", "Coton"],
    pays: ["CM", "GA", "CG", "CD", "CF", "GQ", "ST"],
  },
  est: {
    nom: "Afrique de l'Est",
    cultures: ["Maïs", "Haricot", "Sorgho", "Patate douce", "Manioc", "Pomme de terre", "Mil", "Blé", "Niébé", "Soja", "Arachide", "Sésame"],
    pays: ["KE", "UG", "TZ", "RW", "BI", "SS", "SO", "DJ", "ER"],
  },
  ethiopie: { nom: "Éthiopie et Soudan", cultures: ["Sorgho", "Blé", "Orge", "Maïs", "Haricot", "Pois chiche", "Mil", "Sésame", "Arachide", "Pomme de terre"], pays: ["ET", "SD"] },
  australe: {
    nom: "Afrique australe",
    cultures: ["Maïs", "Sorgho", "Arachide", "Haricot", "Soja", "Tournesol", "Manioc", "Patate douce", "Mil", "Blé", "Pomme de terre", "Coton"],
    pays: ["ZA", "ZW", "ZM", "MW", "MZ", "AO", "BW", "NA", "LS", "SZ", "MG", "KM", "MU"],
  },
  nord: { nom: "Afrique du Nord", cultures: ["Blé", "Orge", "Pois chiche", "Pomme de terre", "Haricot", "Tournesol", "Maïs", "Coton", "Riz", "Sorgho"], pays: ["MA", "DZ", "TN", "LY", "EG", "EH"] },
  chine: { nom: "Chine", cultures: ["Riz", "Blé", "Maïs", "Soja", "Pomme de terre", "Patate douce", "Arachide", "Coton", "Sorgho", "Mil", "Tournesol", "Haricot", "Orge"], pays: ["CN"] },
  asieSud: { nom: "Asie du Sud", cultures: ["Riz", "Blé", "Mil", "Sorgho", "Maïs", "Pois chiche", "Arachide", "Coton", "Soja", "Sésame", "Haricot", "Pomme de terre"], pays: ["IN", "PK", "BD", "NP", "LK"] },
  asieSudEst: { nom: "Asie du Sud-Est", cultures: ["Riz", "Maïs", "Manioc", "Soja", "Arachide", "Patate douce", "Haricot", "Sésame"], pays: ["TH", "VN", "KH", "LA", "MM", "ID", "PH", "MY"] },
  ameriqueSud: { nom: "Amérique du Sud", cultures: ["Soja", "Maïs", "Haricot", "Riz", "Manioc", "Blé", "Coton", "Arachide", "Sorgho", "Tournesol", "Pomme de terre"], pays: ["BR", "AR", "PY", "UY", "BO", "PE", "CO", "VE", "EC", "CL"] },
  ameriqueNord: { nom: "Amérique du Nord", cultures: ["Maïs", "Soja", "Blé", "Coton", "Sorgho", "Orge", "Tournesol", "Arachide", "Haricot", "Pomme de terre"], pays: ["US", "CA", "MX"] },
  europe: { nom: "Europe", cultures: ["Blé", "Orge", "Maïs", "Tournesol", "Pomme de terre", "Soja", "Haricot", "Pois chiche"], pays: ["FR", "ES", "PT", "IT", "DE", "BE", "NL", "GB", "IE", "PL", "RO", "UA", "GR", "HU", "AT", "CH"] },
};

const TROPICAL: NomCulture[] = ["Maïs", "Sorgho", "Riz", "Manioc", "Arachide", "Niébé", "Soja", "Haricot", "Patate douce", "Mil", "Sésame"];
const TEMPERE: NomCulture[] = ["Blé", "Orge", "Maïs", "Pomme de terre", "Soja", "Haricot", "Tournesol", "Pois chiche"];

/** Cultures proposées d'abord pour un pays (code ISO à 2 lettres) ; à défaut, selon la latitude. */
export function culturesDuPays(pays: string | undefined, lat?: number): NomCulture[] {
  const code = (pays ?? "").toUpperCase();
  if (code === "CI") return [...CULTURES_CI];
  const zone = Object.values(ZONES).find((z) => z.pays.includes(code));
  if (zone) return zone.cultures;
  return lat !== undefined && Math.abs(lat) > 30 ? TEMPERE : TROPICAL;
}

/** Nom de la zone de cultures d'un pays (pour l'expliquer à l'utilisateur), ou null. */
export function zoneDuPays(pays: string | undefined): string | null {
  const code = (pays ?? "").toUpperCase();
  if (code === "CI") return "Côte d'Ivoire";
  return Object.values(ZONES).find((z) => z.pays.includes(code))?.nom ?? null;
}

/** Les cultures du catalogue qui ne sont pas dans la liste du pays, pour « Autres cultures ». */
export function autresCultures(pays: string | undefined, lat?: number): NomCulture[] {
  const proposees = new Set(culturesDuPays(pays, lat));
  return CATALOGUE.filter((c) => !proposees.has(c));
}

export const estCulture = (n: string): n is NomCulture => (CATALOGUE as readonly string[]).includes(n);
