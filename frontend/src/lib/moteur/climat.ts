import type { Climat } from "@/lib/contract";

export type ClimatResume = {
  /** Pluie cumulée sur la saison des pluies principale, en mm. */
  pluieSaisonMm: number;
  moisSaison: number;
  /** Température maximale moyenne pendant la saison, en °C (0 si inconnue). */
  tmaxSaison: number;
  saison: { debut: number; fin: number };
  /** Nombre d'années de données (période de meta), 0 si inconnu. */
  annees: number;
};

export function extraireClimat(c: Climat): ClimatResume {
  const saison = c.saisonPluies;
  const mois = Array.from({ length: saison.fin - saison.debut + 1 }, (_, i) => saison.debut - 1 + i);
  const pluieSaisonMm = mois.reduce((s, m) => s + c.pluieMensuelle[m], 0);
  const chaleur = c.onglets.find((o) => o.id === "chaleur")?.valeurs;
  const tmaxSaison = chaleur ? Math.round((mois.reduce((s, m) => s + chaleur[m], 0) / mois.length) * 10) / 10 : 0;
  const periode = c.meta?.periode.match(/(\d{4})\D+(\d{4})/);
  const annees = periode ? Number(periode[2]) - Number(periode[1]) + 1 : 0;
  return { pluieSaisonMm, moisSaison: mois.length, tmaxSaison, saison, annees };
}
