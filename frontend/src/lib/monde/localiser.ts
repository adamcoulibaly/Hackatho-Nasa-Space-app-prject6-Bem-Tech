/**
 * Où est la parcelle ? Le pays et le nom du lieu viennent d'OpenStreetMap (Nominatim, géocodage inverse, sans clé).
 * Côte d'Ivoire : la région ivoirienne la plus proche (données pré-calculées). Ailleurs : un point du monde.
 */
import { regionLaPlusProche } from "@/lib/regions";
import { idPoint } from "./lieu";

export type Localisation = { region: string; pays: string; nomPays: string; lieu?: string };

/** Cadre de la Côte d'Ivoire : repli quand le géocodage ne répond pas (hors ligne). */
const dansCI = (lat: number, lon: number) => lat >= 4.3 && lat <= 10.8 && lon >= -8.7 && lon <= -2.4;

export function reverseUrl(lat: number, lon: number): string {
  const u = new URL("https://nominatim.openstreetmap.org/reverse");
  u.searchParams.set("lat", String(lat));
  u.searchParams.set("lon", String(lon));
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("zoom", "10");
  u.searchParams.set("accept-language", "fr");
  return u.toString();
}

type Adresse = { country_code?: string; country?: string; village?: string; town?: string; city?: string; municipality?: string; county?: string; state?: string };

/** Lit une réponse Nominatim reverse : code pays (majuscules), nom du pays et nom du lieu le plus parlant. */
export function lireReverse(json: unknown): { pays: string; nomPays: string; lieu?: string } | null {
  const a = (json as { address?: Adresse } | null)?.address;
  if (!a?.country_code) return null;
  const lieu = a.village ?? a.town ?? a.city ?? a.municipality ?? a.county ?? a.state;
  return { pays: a.country_code.toUpperCase(), nomPays: a.country ?? a.country_code.toUpperCase(), ...(lieu ? { lieu: lieu.slice(0, 60) } : {}) };
}

export function localisationDe(lat: number, lon: number, trouve: { pays: string; nomPays: string; lieu?: string } | null): Localisation {
  const pays = trouve?.pays ?? (dansCI(lat, lon) ? "CI" : "");
  if (pays === "CI") return { region: regionLaPlusProche(lat, lon).id, pays: "CI", nomPays: "Côte d'Ivoire", ...(trouve?.lieu ? { lieu: trouve.lieu } : {}) };
  return { region: idPoint(lat, lon), pays: pays || "ZZ", nomPays: trouve?.nomPays ?? "Pays inconnu", ...(trouve?.lieu ? { lieu: trouve.lieu } : {}) };
}

/** Localise un point ; sans réponse du géocodeur, se replie sur le cadre de la Côte d'Ivoire. */
export async function localiser(lat: number, lon: number, f: typeof fetch = fetch): Promise<Localisation> {
  let trouve: ReturnType<typeof lireReverse> = null;
  try {
    const r = await f(reverseUrl(lat, lon), { signal: AbortSignal.timeout(8000) });
    if (r.ok) trouve = lireReverse(await r.json());
  } catch {
    /* hors ligne : repli */
  }
  return localisationDe(lat, lon, trouve);
}
