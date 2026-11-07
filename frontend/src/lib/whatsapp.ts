import type { Rotation } from "@/lib/contract";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Culture à semer ensuite (année 2 de la rotation) et son mois de semis. */
export function prochaineCulture(r: Rotation): { culture: string; moisSemis: string } {
  const entree = r.calendrier.find((c) => c.annee === 2 && c.type === "culture") ?? r.calendrier.find((c) => c.type === "culture")!;
  return { culture: entree.culture, moisSemis: MOIS[entree.debutMois - 1] };
}

export function whatsappUrl(r: Rotation, lienAbsolu: string): string {
  const { culture, moisSemis } = prochaineCulture(r);
  const texte = [
    `ForoSat — rotation ${r.id}`,
    `${r.sequence.join(" → ")}`,
    `À semer : ${culture}, vers ${moisSemis}.`,
    r.note,
    `Lacunes : ${r.lacune}`,
    `Confiance : ${r.confiance.niveau}`,
    `Fiche : ${lienAbsolu}`,
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(texte)}`;
}
