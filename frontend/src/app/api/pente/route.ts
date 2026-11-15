import { NextResponse } from "next/server";
import { PNG } from "pngjs";
import { altitudeTerrarium, penteParcelle, TAILLE_TUILE, tuilesDuContour, URL_TERRAIN, ZOOM_PENTE, type PointLatLon } from "@/lib/pente";
import { limiteur, memeOrigine } from "@/lib/limite";

/** Une parcelle agricole tient dans quelques tuiles ; au-delà, ce n'est plus une parcelle. */
const MAX_TUILES = 9;
const MAX_POINTS = 200;
const autorise = limiteur({ max: 30, fenetreMs: 60_000 });
const cache = new Map<string, Promise<PNG | null>>();

async function tuile(x: number, y: number): Promise<PNG | null> {
  const url = URL_TERRAIN(ZOOM_PENTE, x, y);
  if (!cache.has(url)) {
    if (cache.size > 200) cache.clear();
    cache.set(url, (async () => {
      for (let essai = 0; essai < 3; essai++) {
        try {
          const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (r.ok) return PNG.sync.read(Buffer.from(await r.arrayBuffer()));
          if (r.status === 404) return null;
        } catch {
          /* nouvel essai */
        }
      }
      cache.delete(url);
      return null;
    })());
  }
  return cache.get(url)!;
}

/** Pente de la parcelle dessinée (altitude SRTM). Corps : { contour: [[lat, lon], …] }. */
export async function POST(req: Request) {
  if (!memeOrigine(req)) return NextResponse.json({ erreur: "Origine refusée." }, { status: 403 });
  if (!autorise(req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local")) {
    return NextResponse.json({ erreur: "Trop de demandes, réessayez dans une minute." }, { status: 429 });
  }
  let contour: PointLatLon[];
  try {
    const corps = (await req.json()) as { contour?: unknown };
    if (!Array.isArray(corps.contour) || corps.contour.length < 3 || corps.contour.length > MAX_POINTS) throw new Error();
    contour = corps.contour.map((p) => {
      if (!Array.isArray(p) || p.length !== 2) throw new Error();
      const [lat, lon] = p.map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 60 || Math.abs(lon) > 180) throw new Error();
      return [lat, lon] as PointLatLon;
    });
  } catch {
    return NextResponse.json({ erreur: "Contour invalide." }, { status: 400 });
  }
  const tuiles = tuilesDuContour(contour);
  if (tuiles.length > MAX_TUILES) return NextResponse.json({ erreur: "Parcelle trop grande pour calculer la pente." }, { status: 413 });
  const images = new Map<string, PNG | null>();
  await Promise.all(tuiles.map(async (t) => images.set(`${t.x},${t.y}`, await tuile(t.x, t.y))));
  const altitude = (gx: number, gy: number): number | null => {
    const img = images.get(`${Math.floor(gx / TAILLE_TUILE)},${Math.floor(gy / TAILLE_TUILE)}`);
    if (!img) return null;
    const i = ((gy % TAILLE_TUILE) * TAILLE_TUILE + (gx % TAILLE_TUILE)) * 4;
    return altitudeTerrarium(img.data[i], img.data[i + 1], img.data[i + 2]);
  };
  const pente = penteParcelle(contour, altitude);
  if (!pente) return NextResponse.json({ erreur: "Altitude indisponible pour cette parcelle." }, { status: 404 });
  return NextResponse.json({ ...pente, source: "Altitude SRTM (NASA), tuiles Terrain d'AWS Open Data" });
}
