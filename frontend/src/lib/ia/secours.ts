/**
 * Réponse de secours écrite par ForoSat lui-même, à partir des faits calculés par le moteur, quand aucun modèle d'IA
 * ne répond (saturé, quota, réseau). L'agriculteur obtient toujours une réponse juste, jamais un message d'erreur.
 */
import type { Rotation } from "@/lib/contract";

const bonnes = (r: Rotation) => (r.rejeu?.total ? `${r.rejeu.bonnes} bonnes saisons sur ${r.rejeu.total} depuis 2005` : null);
const futur = (r: Rotation) => {
  const p = r.projection?.scenarios.ssp245;
  return p && r.projection ? `vers 2050, ${p.min === p.max ? p.min : `${p.min} à ${p.max}`} bonnes saisons sur ${r.projection.total} (scénario modéré)` : null;
};
const resume = (r: Rotation) => [bonnes(r), r.rejeu?.rendementMoyen !== undefined ? `rendement moyen ${r.rejeu.rendementMoyen} % du potentiel` : null, futur(r)].filter(Boolean).join(", ");
const FIN = "Validez avec un conseiller agricole avant de décider.";

export function reponseSecours(rotation: Rotation, autres: Rotation[], question?: string): string {
  const q = (question ?? "").toLowerCase();
  const toutes = [rotation, ...autres];
  const citee = autres.find((r) => new RegExp(`rotation ${r.id.toLowerCase()}\\b`).test(q));

  if (citee) {
    const meilleure = [rotation, citee].sort((a, b) => (b.rejeu?.bonnes ?? 0) - (a.rejeu?.bonnes ?? 0) || (b.rejeu?.rendementMoyen ?? 0) - (a.rejeu?.rendementMoyen ?? 0))[0];
    return [
      `Rotation ${rotation.id} (${rotation.sequence.join(" → ")}) : ${resume(rotation) || "pas de saisons rejouées"}.`,
      `Rotation ${citee.id} (${citee.sequence.join(" → ")}) : ${resume(citee) || "pas de saisons rejouées"}.`,
      `Sur les saisons réelles, la rotation ${meilleure.id} tient le mieux.${toutes.find((r) => r.recommandee) ? ` ForoSat conseille la rotation ${toutes.find((r) => r.recommandee)!.id}, en tenant compte de vos priorités.` : ""}`,
      FIN,
    ].join("\n");
  }

  if (/lequel|laquelle|choisir|meilleure|conseill/.test(q) && autres.length) {
    const c = toutes.find((r) => r.recommandee) ?? rotation;
    return [
      `ForoSat vous conseille la rotation ${c.id} : ${c.sequence.join(" → ")}.`,
      `Pourquoi : ${c.pourquoi.slice(0, 2).join(" ")}`,
      resume(c) ? `Sur les données NASA : ${resume(c)}.` : "",
      FIN,
    ].filter(Boolean).join("\n");
  }

  return [
    `Rotation ${rotation.id} : ${rotation.sequence.join(" → ")}.`,
    `Pourquoi : ${rotation.pourquoi.slice(0, 2).join(" ")}`,
    resume(rotation) ? `Sur les données NASA : ${resume(rotation)}.` : "",
    `À surveiller : ${rotation.lacune}`,
    FIN,
  ].filter(Boolean).join("\n");
}
