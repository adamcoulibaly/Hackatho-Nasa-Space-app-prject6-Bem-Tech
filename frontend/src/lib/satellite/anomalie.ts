/**
 * Détection précoce d'une anomalie de végétation : le NDVI du dernier mois publié, à la parcelle, comparé au même mois
 * des 3 années précédentes au même endroit. Un écart de −0,1 ou plus est un signal à vérifier sur le terrain,
 * jamais un diagnostic (manque d'eau, levée tardive, ravageurs, récolte déjà faite… peuvent l'expliquer).
 */
const SEUIL = -0.1;
const ESSAIS = 4;
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const virgule = (x: number) => x.toFixed(2).replace(".", ",");

export type Anomalie = { mois: string; ndvi: number; habituel: number; ecart: number; anomalie: boolean; message: string };

export async function anomalieVegetation(aujourdhui: Date, mesurer: (mois: string) => Promise<number | null>): Promise<Anomalie | null> {
  for (let k = 1; k <= ESSAIS; k++) {
    const d = new Date(Date.UTC(aujourdhui.getUTCFullYear(), aujourdhui.getUTCMonth() - k, 1));
    const mois = d.toISOString().slice(0, 7);
    const ndvi = await mesurer(mois).catch(() => null);
    if (ndvi === null) continue;
    const passe = await Promise.all([1, 2, 3].map((a) => mesurer(`${d.getUTCFullYear() - a}-${mois.slice(5)}`).catch(() => null)));
    const valides = passe.filter((x): x is number => x !== null);
    if (valides.length < 2) return null;
    const habituel = Math.round((valides.reduce((a, b) => a + b, 0) / valides.length) * 100) / 100;
    const ecart = Math.round((ndvi - habituel) * 100) / 100;
    const anomalie = ecart <= SEUIL;
    const nomMois = MOIS[Number(mois.slice(5)) - 1];
    return {
      mois, ndvi, habituel, ecart, anomalie,
      message: anomalie
        ? `Végétation plus faible que d'habitude en ${nomMois} (${virgule(ndvi)} contre ${virgule(habituel)} les années précédentes) : signal à vérifier sur le terrain (manque d'eau, levée, ravageurs…). Ce n'est pas un diagnostic.`
        : `Végétation habituelle pour ${nomMois} (${virgule(ndvi)}, contre ${virgule(habituel)} les années précédentes).`,
    };
  }
  return null;
}
