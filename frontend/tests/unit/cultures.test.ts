import fs from "node:fs";
import path from "node:path";
import { CulturesSchema, CultureSchema } from "@/lib/contract";
import { CULTURES } from "@/lib/parcelle/validate";
import { getCultures } from "@/lib/data";

const brut = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../knowledge/cultures.json"), "utf8"));

describe("fiches cultures", () => {
  it("couvrent exactement les 8 cultures du formulaire", async () => {
    const c = await getCultures();
    expect(c.map((x) => x.nom).sort()).toEqual([...CULTURES].sort());
  });
  it("seules l'arachide et le niébé sont des légumineuses", () => {
    const c = CulturesSchema.parse(brut);
    expect(c.filter((x) => x.legumineuse).map((x) => x.nom).sort()).toEqual(["Arachide", "Niébé"]);
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
