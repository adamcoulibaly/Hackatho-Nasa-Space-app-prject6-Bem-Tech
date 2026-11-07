import fs from "node:fs";
import path from "node:path";
import { RotationsSchema } from "@/lib/contract";
import { simulate } from "@/lib/simulateur";

const [A, B, C] = RotationsSchema.parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo/rotations.json"), "utf8")));

describe("simulate", () => {
  it("sans changement, renvoie les niveaux d'origine", () => {
    expect(simulate(B, 0, 0)).toEqual({ secheresse: 3, eau: 3 });
  });
  it("30 % de pluie en moins fait perdre 2 niveaux, borné à 1", () => {
    expect(simulate(B, -30, 0)).toEqual({ secheresse: 1, eau: 1 });
  });
  it("15 % de pluie en moins fait perdre 1 niveau", () => {
    expect(simulate(C, -15, 0)).toEqual({ secheresse: 4, eau: 4 });
  });
  it("2 °C de plus fait perdre 1 niveau", () => {
    expect(simulate(C, 0, 2)).toEqual({ secheresse: 4, eau: 4 });
  });
  it("plus de pluie ne fait jamais monter au-delà de 5", () => {
    expect(simulate(C, 20, 0)).toEqual({ secheresse: 5, eau: 5 });
  });
  it("ne modifie pas la rotation d'origine", () => {
    const avant = JSON.stringify(A);
    simulate(A, -30, 4);
    expect(JSON.stringify(A)).toBe(avant);
  });
});
