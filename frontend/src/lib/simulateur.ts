import type { Rotation } from "@/lib/contract";

const clamp = (n: number) => Math.min(5, Math.max(1, n));

/**
 * Effet d'un scénario sur la résistance d'une rotation.
 * Chaque tranche de 15 % de pluie en moins, ou de 2 °C en plus, retire un niveau (borné à 1–5).
 * Règle simple et transparente, à remplacer par le moteur quand il existera.
 */
export function simulate(rotation: Rotation, deltaPluiePct: number, deltaChaleurC: number): { secheresse: number; eau: number } {
  const pas = Math.floor(Math.max(0, -deltaPluiePct) / 15) + Math.floor(Math.max(0, deltaChaleurC) / 2);
  return {
    secheresse: clamp(rotation.scores.secheresse - pas),
    eau: clamp(rotation.scores.eau - pas),
  };
}
