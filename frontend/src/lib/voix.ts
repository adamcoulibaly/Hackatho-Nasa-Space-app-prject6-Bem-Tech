/** Texte de la fiche, en phrases simples, pour la lecture à voix haute. */
export function texteFiche(
  r: { id: string; sequence: string[]; pourquoi: string[]; lacune: string },
  prochaine: { culture: string; moisSemis: string },
): string {
  return [
    `Rotation ${r.id} : ${r.sequence.join(", puis ")}.`,
    `La saison prochaine, semez ${prochaine.culture} dès les premières bonnes pluies, vers ${prochaine.moisSemis}.`,
    `Pourquoi : ${r.pourquoi.join(" ")}`,
    `À vérifier : ${r.lacune}.`,
  ].join(" ");
}
