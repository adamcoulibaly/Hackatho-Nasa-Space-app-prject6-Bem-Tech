const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS_MAX = 45;

/** Saison du moment calculée à partir des saisons des pluies de la région et du mois courant (1 à 12). */
export function saisonDuMoment(saisons: { debut: number; fin: number }[], mois: number): { saison: string; titre: string; accent: string } {
  const en = saisons.find((s) => s.debut <= mois && mois <= s.fin);
  if (en) return { saison: "Saison des pluies", titre: "Saison des pluies jusqu'en", accent: MOIS[en.fin - 1] };
  const prochaine = [...saisons].sort((a, b) => ((a.debut - mois + 12) % 12) - ((b.debut - mois + 12) % 12))[0];
  return { saison: "Saison sèche", titre: "Prochaines pluies vers", accent: prochaine ? MOIS[prochaine.debut - 1] : "—" };
}

/** Vrai si la dernière mesure date de moins de 45 jours (sinon elle n'est plus « du moment »). */
export function mesuresRecentes(dateFin: string | undefined, maintenant: Date = new Date()): boolean {
  if (!dateFin) return false;
  const fin = new Date(`${dateFin}T00:00:00Z`).getTime();
  return Number.isFinite(fin) && (maintenant.getTime() - fin) / 86_400_000 <= JOURS_MAX;
}
