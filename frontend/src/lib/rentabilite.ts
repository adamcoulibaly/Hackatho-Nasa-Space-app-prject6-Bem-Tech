/**
 * Rentabilité avec les prix de l'agriculteur : ForoSat n'a pas de prix locaux fiables, l'agriculteur saisit ce qu'il
 * voit au marché (prix daté), sa récolte habituelle et ses dépenses. La recette tient compte du rendement relatif
 * moyen de chaque culture sur les saisons réelles de la région (FAO-33). Tout reste sur le téléphone.
 */
import type { Culture, Saisons } from "@/lib/contract";
import { rendementSaison } from "@/lib/moteur/rejeu";

const CLE = "forosat.prix";
export type PrixCulture = { prixKg: number; recolteKgHa: number; chargesHa: number; date: string };
export type Prix = Record<string, PrixCulture>;

export function lirePrix(): Prix {
  try {
    const p = JSON.parse(localStorage.getItem(CLE) ?? "{}");
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

export function enregistrerPrix(culture: string, v: Omit<PrixCulture, "date">, date: string): Prix {
  const p = { ...lirePrix(), [culture]: { ...v, date } };
  try {
    localStorage.setItem(CLE, JSON.stringify(p));
  } catch {
    /* stockage indisponible */
  }
  return p;
}

export type Rentabilite = {
  parCulture: { culture: string; rendement: number; recette: number; depenses: number; marge: number; date: string }[];
  margeMoyenneAn: number | null;
  manquants: string[];
};

/** Rendement relatif moyen d'une culture sur les saisons réelles (fraction), 1 sans données. */
function rendementMoyen(culture: Culture, s: Saisons | null): number {
  const liste = s?.cultures[culture.nom] ?? [];
  if (!liste.length) return 1;
  return liste.reduce((t, v) => t + rendementSaison(v, culture.ky.valeur), 0) / liste.length / 100;
}

export function rentabilite(sequence: string[], prix: Prix, s: Saisons | null, cultures: Culture[], surface: number): Rentabilite {
  const manquants = [...new Set(sequence.filter((c) => !prix[c]))];
  const parCulture = [...new Set(sequence)]
    .filter((c) => prix[c])
    .map((c) => {
      const fiche = cultures.find((x) => x.nom === c);
      const r = fiche ? rendementMoyen(fiche, s) : 1;
      const p = prix[c];
      const recette = surface * p.recolteKgHa * r * p.prixKg;
      const depenses = surface * p.chargesHa;
      return { culture: c, rendement: Math.round(r * 100), recette, depenses, marge: recette - depenses, date: p.date };
    });
  const margeMoyenneAn = manquants.length
    ? null
    : Math.round(sequence.reduce((t, c) => t + parCulture.find((x) => x.culture === c)!.marge, 0) / sequence.length);
  return { parCulture, margeMoyenneAn, manquants };
}
