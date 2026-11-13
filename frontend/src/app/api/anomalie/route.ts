import { NextResponse } from "next/server";
import { anomalieVegetation } from "@/lib/satellite/anomalie";
import { ndviMois } from "@/lib/satellite/ndvi";
import { lireTuile } from "@/lib/satellite/tuile";

// Le NDVI mensuel change une fois par mois : réponse gardée 1 jour.
export const revalidate = 86400;

/** Anomalie de végétation à la parcelle : ?lat=…&lon=… (arrondis à 0,01°, environ 1 km). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lat = Math.round(Number(q.get("lat")) * 100) / 100;
  const lon = Math.round(Number(q.get("lon")) * 100) / 100;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !q.get("lat") || !q.get("lon")) {
    return NextResponse.json({ erreur: "Position invalide." }, { status: 400 });
  }
  const r = await anomalieVegetation(new Date(), (mois) => ndviMois(lat, lon, mois, (u) => lireTuile(u)));
  return r ? NextResponse.json(r) : NextResponse.json({ erreur: "Images satellite indisponibles pour cette parcelle." }, { status: 404 });
}
