import fs from "node:fs";
import path from "node:path";
import { LexiqueSchema } from "@/lib/contract";
import { filterLexique } from "@/lib/lexique";

const termes = LexiqueSchema.parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo/lexique.json"), "utf8")));

describe("filterLexique", () => {
  it("ignore les accents et la casse", () => {
    expect(filterLexique(termes, "evapo").map((t) => t.terme)).toContain("Évapotranspiration");
    expect(filterLexique(termes, "evapotransp").map((t) => t.terme)).toEqual(["Évapotranspiration"]);
    expect(filterLexique(termes, "HUMIDITE").map((t) => t.terme)).toContain("Humidité du sol");
  });
  it("cherche aussi dans la définition", () => {
    expect(filterLexique(termes, "azote").map((t) => t.terme)).toContain("Fixation de l'azote");
  });
  it("ne trouve rien pour un mot inconnu", () => {
    expect(filterLexique(termes, "zzz")).toEqual([]);
  });
  it("renvoie tous les termes pour une recherche vide ou faite d'espaces", () => {
    expect(filterLexique(termes, "")).toHaveLength(20);
    expect(filterLexique(termes, "   ")).toHaveLength(20);
  });
});
