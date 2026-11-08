import { z } from "zod";
import type { ConfigIA } from "@/lib/ia/assistant";
import { analyserPhoto, type AnalysePhoto } from "@/lib/ia/vision";
import { comparer, type Comparaison } from "@/lib/satellite/comparer";

export const TAILLE_MAX = 2_800_000;
const ECHEC = "Analyse impossible, reprenez la photo de plus loin, en plein jour.";
const CONSEIL_SOL_NU = "Sol nu en pleine saison : une culture de couverture (niébé, arachide) protège le sol.";

const DemandePhoto = z.object({
  image: z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  region: z.string().regex(/^[a-z-]{2,40}$/),
});

export type ReponsePhoto =
  | {
      statut: 200;
      corps: { analyse: AnalysePhoto; satellite: { ndvi: number; mois: string; normale: number | null } | null; comparaison: Comparaison; conseil?: string };
    }
  | { statut: 400 | 413 | 422 | 503; corps: { erreur: string } };

/** Arrondi à 0,01° (environ 1 km) : la position exacte de la parcelle ne quitte pas le serveur. */
const arrondir = (x: number) => Math.round(x * 100) / 100;

export async function traiterPhoto(
  corps: unknown,
  deps: {
    config: ConfigIA;
    modele: string;
    fetch: typeof fetch;
    ndvi: (lat: number, lon: number) => Promise<{ ndvi: number; mois: string } | null>;
    normale: (region: string, mois: string) => number | null | Promise<number | null>;
    /** Vrai si l'on est dans la saison des pluies principale de la région. */
    enSaison: (region: string) => boolean | Promise<boolean>;
  },
): Promise<ReponsePhoto> {
  const image = (corps as { image?: unknown } | null)?.image;
  if (typeof image === "string" && image.length > TAILLE_MAX) return { statut: 413, corps: { erreur: "Photo trop lourde (2 Mo au plus)." } };
  const d = DemandePhoto.safeParse(corps);
  if (!d.success) return { statut: 400, corps: { erreur: "Demande invalide." } };
  if (!deps.config.cle) return { statut: 503, corps: { erreur: "L'analyse de photo n'est pas encore configurée." } };
  const lat = arrondir(d.data.lat);
  const lon = arrondir(d.data.lon);
  const [analyse, sat] = await Promise.all([
    analyserPhoto(d.data.image, { config: deps.config, modele: deps.modele, fetch: deps.fetch }),
    deps.ndvi(lat, lon).catch(() => null),
  ]);
  if (!analyse) return { statut: 422, corps: { erreur: ECHEC } };
  const normale = sat ? await deps.normale(d.data.region, sat.mois) : null;
  const conseil = analyse.etat === "sol_nu" && (await deps.enSaison(d.data.region)) ? CONSEIL_SOL_NU : undefined;
  return {
    statut: 200,
    corps: {
      analyse,
      satellite: sat ? { ...sat, normale } : null,
      comparaison: comparer(analyse, sat?.ndvi ?? null, normale, sat?.mois),
      ...(conseil ? { conseil } : {}),
    },
  };
}
