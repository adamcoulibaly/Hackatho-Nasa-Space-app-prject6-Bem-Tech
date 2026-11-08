import { etatSemis, type Jour } from "@/lib/moteur/etat-semis";
import { regionParId } from "@/lib/regions";

const POWER = "https://power.larc.nasa.gov/api/temporal/daily/point";
const PANNE = { erreur: "Données NASA POWER indisponibles pour le moment." };
const aaaammjj = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");

export type ReponseSemis =
  | { statut: 200; corps: ReturnType<typeof etatSemis> & { dateDonnees: string } }
  | { statut: 404 | 503; corps: { erreur: string } };

/** État de semis d'une région : pluie journalière NASA POWER des 30 derniers jours, au chef-lieu. */
export async function etatSemisRegion(
  region: string,
  deps: { fetch: typeof fetch; aujourdhui: Date; climat: { saisonPluies: { debut: number; fin: number } } },
): Promise<ReponseSemis> {
  const r = regionParId(region);
  if (!r) return { statut: 404, corps: { erreur: `Région « ${region} » inconnue.` } };
  const fin = new Date(deps.aujourdhui);
  fin.setUTCDate(fin.getUTCDate() - 1);
  const debut = new Date(deps.aujourdhui);
  debut.setUTCDate(debut.getUTCDate() - 30);
  const q = new URLSearchParams({ parameters: "PRECTOTCORR", community: "AG", latitude: String(r.lat), longitude: String(r.lon), start: aaaammjj(debut), end: aaaammjj(fin), format: "JSON" });
  let valeurs: Record<string, number>;
  try {
    const rep = await deps.fetch(`${POWER}?${q}`, { next: { revalidate: 21600 } } as RequestInit);
    if (!rep.ok) return { statut: 503, corps: PANNE };
    valeurs = (await rep.json()).properties.parameter.PRECTOTCORR;
  } catch {
    return { statut: 503, corps: PANNE };
  }
  const jours: Jour[] = Object.keys(valeurs)
    .sort()
    .map((k) => ({ date: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6)}`, pluie: valeurs[k] <= -999 ? null : valeurs[k] }));
  const publies = jours.filter((j) => j.pluie !== null);
  if (publies.length === 0) return { statut: 503, corps: PANNE };
  const dateDonnees = publies.at(-1)!.date;
  return { statut: 200, corps: { ...etatSemis(jours.filter((j) => j.date <= dateDonnees), deps.climat.saisonPluies), dateDonnees } };
}
