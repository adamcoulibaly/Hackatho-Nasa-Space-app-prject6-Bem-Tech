import { CATALOGUE } from "@/lib/monde/pays";
import fs from "node:fs";
import path from "node:path";
import { CulturesSchema, CultureSchema } from "@/lib/contract";
import { CULTURES } from "@/lib/parcelle/validate";
import { getCultures } from "@/lib/data";

const brut = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../knowledge/cultures.json"), "utf8"));

describe("fiches cultures", () => {
  it("couvrent exactement le catalogue mondial, dont les 8 cultures de la Côte d'Ivoire", async () => {
    const c = await getCultures();
    expect(c.map((x) => x.nom).sort()).toEqual([...CATALOGUE].sort());
    for (const n of CULTURES) expect(c.map((x) => x.nom)).toContain(n);
  });
  it("les légumineuses sont l'arachide, le niébé, le soja, le haricot et le pois chiche", () => {
    const c = CulturesSchema.parse(brut);
    expect(c.filter((x) => x.legumineuse).map((x) => x.nom).sort()).toEqual(["Arachide", "Haricot", "Niébé", "Pois chiche", "Soja"]);
  });
  it("les cultures de saison fraîche ont un seuil de semis, les autres n'en ont pas", () => {
    const frais = CulturesSchema.parse(brut).filter((x) => x.semisFrais !== undefined).map((x) => x.nom).sort();
    expect(frais).toEqual(["Blé", "Orge", "Pois chiche", "Pomme de terre"]);
  });
  it("chaque fiche est sourcée, à valider, et dit que revenu et marché sont des hypothèses", () => {
    for (const x of CulturesSchema.parse(brut)) {
      expect(x.sources.length).toBeGreaterThanOrEqual(1);
      expect(x.aValider).toBe(true);
      expect(x.hypotheses).toEqual(expect.arrayContaining(["revenu", "marche"]));
      expect(x.eauMm[0]).toBeLessThan(x.eauMm[1]);
    }
  });
  it("chaque fiche porte ses stades FAO-56 (4 durées, 3 coefficients), à valider", () => {
    for (const x of CulturesSchema.parse(brut)) {
      expect(x.stades.jours).toHaveLength(4);
      expect(x.stades.kc).toHaveLength(3);
      expect(x.stades.source).toMatch(/à valider par l'agronome/);
    }
    expect(CulturesSchema.parse(brut).find((x) => x.nom === "Maïs")!.stades).toMatchObject({ jours: [20, 35, 40, 30], kc: [0.3, 1.2, 0.6] });
  });
  it("rejette une note hors de 1 à 5", () => {
    expect(() => CultureSchema.parse({ ...brut[0], secheresse: 6 })).toThrow();
  });
});
