import fs from "node:fs";
import path from "node:path";
import { ClimatSchema, RotationsSchema, CouchesSchema, SourcesSchema, LexiqueSchema } from "@/lib/contract";

const DIR = path.resolve(__dirname, "../../../data/pilot/korhogo");
const load = (n: string) => JSON.parse(fs.readFileSync(path.join(DIR, `${n}.json`), "utf8"));

describe("contrat de données — Korhogo", () => {
  it("climat : pluie mensuelle et trou GRACE 2017–2018", () => {
    const c = ClimatSchema.parse(load("climat"));
    expect(c.pluieMensuelle).toEqual([5, 15, 40, 80, 120, 150, 190, 260, 200, 90, 20, 5]);
    const trous = c.grace.filter((g) => g.ecart === null).map((g) => g.annee);
    expect(trous).toEqual([2017, 2018]);
    expect(c.grace).toHaveLength(21);
    expect(c.matrice).toHaveLength(6);
    expect(c.indicateurs).toHaveLength(4);
    expect(c.alertes).toHaveLength(3);
  });

  it("rotations : A, B, C avec séquences et scores de la maquette", () => {
    const r = RotationsSchema.parse(load("rotations"));
    expect(r.map((x) => x.id)).toEqual(["A", "B", "C"]);
    expect(r.map((x) => x.sequence)).toEqual([
      ["Maïs", "Coton"],
      ["Maïs", "Arachide", "Coton"],
      ["Sorgho", "Niébé", "Maïs"],
    ]);
    const b = r[1];
    expect(b.scores).toEqual({ fertilite: 4, eau: 3, secheresse: 3, revenu: 4, erosion: 3, fourrage: 4, marche: 4 });
    for (const x of r) expect(x.lacune.length).toBeGreaterThan(0);
    expect(b.confiance.niveau).toBe("moyenne");
  });

  it("couches, sources et lexique", () => {
    expect(CouchesSchema.parse(load("couches"))).toHaveLength(4);
    const s = SourcesSchema.parse(load("sources"));
    expect(s.sources).toHaveLength(8);
    expect(s.approches).toHaveLength(4);
    expect(LexiqueSchema.parse(load("lexique"))).toHaveLength(14);
  });

  it("rejette un score hors de 1 à 5", () => {
    const r = load("rotations");
    r[0].scores.fertilite = 6;
    expect(() => RotationsSchema.parse(r)).toThrow();
  });
});
