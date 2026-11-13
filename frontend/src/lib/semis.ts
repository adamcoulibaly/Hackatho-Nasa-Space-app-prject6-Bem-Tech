import { etatSemis, type Jour } from "@/lib/moteur/etat-semis";
import { regionParId } from "@/lib/regions";
import { alertesMeteo } from "@/lib/moteur/alertes";

const POWER = "https://power.larc.nasa.gov/api/temporal/daily/point";
const PANNE = { erreur: "Données NASA POWER indisponibles pour le moment." };
const aaaammjj = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");

export type ReponseSemis =
  | { statut: 200; corps: ReturnType<typeof etatSemis> & ReturnType<typeof alertesMeteo> & { dateDonnees: string } }
  | { statut: 404 | 503; corps: { erreur: string } };

/** État de semis d'une région : pluie journalière NASA POWER des 30 derniers jours, au chef-lieu. */
export async function etatSemisRegion(
  region: string,
  deps: { fetch: typeof fetch; aujourdhui: Date; climat: { saisonPluies: { debut: number; fin: number }; saisons?: { debut: number; fin: number }[] } },
): Promise<ReponseSemis> {
  const r = regionParId(region);
  if (!r) return { statut: 404, corps: { erreur: `Région « ${region} » inconnue.` } };
  const fin = new Date(deps.aujourdhui);
  fin.setUTCDate(fin.getUTCDate() - 1);
  const debut = new Date(deps.aujourdhui);
  // 45 jours : assez pour voir le début de la saison et une poche sèche qui dure.
  debut.setUTCDate(debut.getUTCDate() - 45);
  const q = new URLSearchParams({ parameters: "PRECTOTCORR,T2M_MAX", community: "AG", latitude: String(r.lat), longitude: String(r.lon), start: aaaammjj(debut), end: aaaammjj(fin), format: "JSON" });
  let valeurs: Record<string, number>;
  let tmax: Record<string, number> = {};
  try {
    const rep = await deps.fetch(`${POWER}?${q}`, { next: { revalidate: 21600 } } as RequestInit);
    if (!rep.ok) return { statut: 503, corps: PANNE };
    const p = (await rep.json()).properties.parameter;
    valeurs = p.PRECTOTCORR;
    tmax = p.T2M_MAX ?? {};
  } catch {
    return { statut: 503, corps: PANNE };
  }
  const jours: Jour[] = Object.keys(valeurs)
    .sort()
    .map((k) => ({
      date: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6)}`,
      pluie: valeurs[k] <= -999 ? null : valeurs[k],
      tmax: tmax[k] == null || tmax[k] <= -999 ? null : tmax[k],
    }));
  const publies = jours.filter((j) => j.pluie !== null);
  if (publies.length === 0) return { statut: 503, corps: PANNE };
  const dateDonnees = publies.at(-1)!.date;
  const publiesJusqua = jours.filter((j) => j.date <= dateDonnees);
  const saisons = deps.climat.saisons ?? [deps.climat.saisonPluies];
  return { statut: 200, corps: { ...etatSemis(publiesJusqua, saisons), ...alertesMeteo(publiesJusqua, saisons), dateDonnees } };
}
