/** Climat et saisons d'un point du monde, calculés côté serveur depuis NASA POWER (réponses gardées en cache). */
import type { Climat, Culture, Saisons } from "@/lib/contract";
import { climatComplet, type BrutPower } from "./climat";
import { pointDepuisId, libellePoint } from "./lieu";
import { saisonsLieu, serieDepuisPower } from "./saisons";

const POWER = "https://power.larc.nasa.gov/api/temporal";
export const ANNEES = Array.from({ length: 21 }, (_, i) => 2005 + i);
const aaaammjj = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");

export class PowerIndisponible extends Error {}

async function power(chemin: "monthly" | "daily", params: Record<string, string>, revalider: number, f: typeof fetch = fetch): Promise<BrutPower> {
  const q = new URLSearchParams({ community: "AG", format: "JSON", ...params });
  let derniere: unknown;
  for (let essai = 0; essai < 3; essai++) {
    try {
      const r = await f(`${POWER}/${chemin}/point?${q}`, { headers: { "User-Agent": "forosat" }, signal: AbortSignal.timeout(45000), next: { revalidate: revalider } } as RequestInit);
      if (r.ok) return (await r.json()) as BrutPower;
      derniere = new Error(`NASA POWER : ${r.status}`);
      if (r.status < 500 && r.status !== 429) break;
    } catch (e) {
      derniere = e;
    }
  }
  throw new PowerIndisponible(String(derniere));
}

/** Climat complet d'un point du monde (id « pt_… »), ou null si l'identifiant est invalide. */
export async function climatPoint(id: string, aujourdhui = new Date(), f: typeof fetch = fetch): Promise<Climat | null> {
  const p = pointDepuisId(id);
  if (!p) return null;
  const coords = { latitude: String(p.lat), longitude: String(p.lon) };
  const fin = new Date(aujourdhui); fin.setUTCDate(fin.getUTCDate() - 1);
  const debut = new Date(aujourdhui); debut.setUTCDate(debut.getUTCDate() - 45);
  const [mensuel, jours] = await Promise.all([
    power("monthly", { parameters: "T2M_MAX,PRECTOTCORR,GWETROOT", start: "2005", end: "2025", ...coords }, 30 * 86400, f),
    power("daily", { parameters: "PRECTOTCORR,T2M_MAX,GWETROOT", start: aaaammjj(debut), end: aaaammjj(fin), ...coords }, 21600, f).catch(() => null),
  ]);
  return climatComplet(mensuel, jours, { id, chefLieu: libellePoint(p.lat, p.lon), lat: p.lat, lon: p.lon }, aujourdhui);
}

/** Saisons réelles 2005–2025 rejouées pour toutes les cultures du catalogue, ou null si l'identifiant est invalide. */
export async function saisonsPoint(id: string, cultures: Culture[], climat: Pick<Climat, "saisonPluies">, f: typeof fetch = fetch): Promise<Saisons | null> {
  const p = pointDepuisId(id);
  if (!p) return null;
  const brut = await power("daily", { parameters: "PRECTOTCORR,T2M_MAX,T2M_MIN", start: "20050101", end: "20251231", latitude: String(p.lat), longitude: String(p.lon) }, 30 * 86400, f);
  return saisonsLieu(serieDepuisPower(brut), p.lat, id, climat.saisonPluies, cultures, ANNEES);
}
