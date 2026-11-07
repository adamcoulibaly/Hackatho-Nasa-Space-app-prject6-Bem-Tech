import fs from "node:fs";
import path from "node:path";
import { ClimatSchema, RotationSchema, CouchesSchema, SourcesSchema, LexiqueSchema } from "@/lib/contract";
import { rotations } from "../helpers/moteur";

const DIR = path.resolve(__dirname, "../../../data/pilot/korhogo");
const load = (n: string) => JSON.parse(fs.readFileSync(path.join(DIR, `${n}.json`), "utf8"));

describe("contrat de données — Korhogo", () => {
  it("climat : pluie mensuelle et trou GRACE 2017–2018", () => {
    const c = ClimatSchema.parse(load("climat"));
    expect(c.pluieMensuelle).toHaveLength(12);
    expect(c.saisonPluies.debut).toBeLessThanOrEqual(c.saisonPluies.fin);
    const trous = c.grace.filter((g) => g.ecart === null).map((g) => g.annee);
    expect(trous).toEqual([2017, 2018]);
    expect(c.grace).toHaveLength(21);
    expect(c.matrice).toHaveLength(6);
    expect(c.indicateurs).toHaveLength(4);
    expect(c.alertes).toHaveLength(3);
  });

  it("couches, sources et lexique", () => {
    expect(CouchesSchema.parse(load("couches"))).toHaveLength(4);
    const s = SourcesSchema.parse(load("sources"));
    expect(s.sources).toHaveLength(8);
    expect(s.approches).toHaveLength(4);
    expect(LexiqueSchema.parse(load("lexique"))).toHaveLength(14);
  });

  it("rejette un score hors de 1 à 5", () => {
    const r = rotations()[0];
    expect(() => RotationSchema.parse({ ...r, scores: { ...r.scores, fertilite: 6 } })).toThrow();
  });
});
