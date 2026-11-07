import { CULTURES, PRIORITES, type Parcelle } from "@/lib/parcelle/validate";
import { REGION_IDS } from "@/lib/regions";

/**
 * Lien de fiche qui porte la parcelle (sans le contour, qui reste sur l'appareil) :
 * celui qui le reçoit recalcule exactement la même rotation.
 */
export function lienFiche(id: "A" | "B" | "C", p: Parcelle): string {
  const q = new URLSearchParams({
    r: p.region,
    s: String(p.surface),
    c: p.cultures.join(","),
    p: p.priorites.map((x) => PRIORITES.indexOf(x as (typeof PRIORITES)[number])).filter((i) => i >= 0).join(","),
    e: p.eau,
    m: p.materiel,
  });
  return `/fiche/${id}?${q.toString()}`;
}

/** Parcelle lue dans un lien de fiche, ou null si un paramètre manque ou est invalide. */
export function lireLienFiche(q: URLSearchParams): Parcelle | null {
  const r = q.get("r");
  const c = q.get("c");
  const pr = q.get("p");
  const e = q.get("e");
  const m = q.get("m");
  const s = Number(q.get("s") ?? "1");
  if (!r || !REGION_IDS.includes(r) || !c || pr === null || !e || !m) return null;
  const cultures = c.split(",");
  if (cultures.some((x) => !(CULTURES as readonly string[]).includes(x))) return null;
  const idx = pr === "" ? [] : pr.split(",").map(Number);
  if (idx.some((i) => !Number.isInteger(i) || i < 0 || i >= PRIORITES.length)) return null;
  if (e !== "pluie" && e !== "irrigation") return null;
  if (m !== "daba" && m !== "traction" && m !== "tracteur") return null;
  if (!Number.isFinite(s) || s <= 0) return null;
  return { region: r, surface: s, cultures, priorites: idx.map((i) => PRIORITES[i]), eau: e, materiel: m };
}
