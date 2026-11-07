import { simulate } from "@/lib/simulateur";
import { rotations } from "../helpers/moteur";

const [A, B, C] = rotations();
const moins = (v: number, n: number) => Math.max(1, v - n);

describe("simulate", () => {
  it("sans changement, renvoie les niveaux d'origine", () => {
    expect(simulate(B, 0, 0)).toEqual({ secheresse: B.scores.secheresse, eau: B.scores.eau });
  });
  it("30 % de pluie en moins fait perdre 2 niveaux, borné à 1", () => {
    expect(simulate(B, -30, 0)).toEqual({ secheresse: moins(B.scores.secheresse, 2), eau: moins(B.scores.eau, 2) });
  });
  it("15 % de pluie en moins ou 2 °C de plus font perdre 1 niveau", () => {
    const attendu = { secheresse: moins(C.scores.secheresse, 1), eau: moins(C.scores.eau, 1) };
    expect(simulate(C, -15, 0)).toEqual(attendu);
    expect(simulate(C, 0, 2)).toEqual(attendu);
  });
  it("plus de pluie ne change rien", () => {
    expect(simulate(C, 20, 0)).toEqual({ secheresse: C.scores.secheresse, eau: C.scores.eau });
  });
  it("ne modifie pas la rotation d'origine", () => {
    const avant = JSON.stringify(A);
    simulate(A, -30, 4);
    expect(JSON.stringify(A)).toBe(avant);
  });
});
