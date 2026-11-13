import fs from "node:fs";
import path from "node:path";
import { ClimatSchema, RotationSchema, CouchesSchema, SourcesSchema, LexiqueSchema } from "@/lib/contract";
import { rotations } from "../helpers/moteur";

const DIR = path.resolve(__dirname, "../../../data/pilot/korhogo");
const REGIONS = path.resolve(__dirname, "../../../data/regions");
const load = (n: string) => JSON.parse(fs.readFileSync(path.join(DIR, `${n}.json`), "utf8"));

describe("contrat de données — Korhogo", () => {
  it("climat de Korhogo : entièrement réel, végétation et eau stockée comprises", () => {
    const c = ClimatSchema.parse(JSON.parse(fs.readFileSync(path.join(REGIONS, "poro.json"), "utf8")));
    expect(c.pluieMensuelle).toHaveLength(12);
    expect(c.saisonPluies.debut).toBeLessThanOrEqual(c.saisonPluies.fin);
    expect(c.grace!.find((g) => g.annee === 2017)!.ecart).toBeNull(); // lacune GRACE → GRACE-FO
    expect(c.grace!.filter((g) => g.ecart !== null).length).toBeGreaterThan(10);
    expect(c.onglets.map((o) => o.id)).toEqual(["pluie", "chaleur", "sol", "veg"]);
    expect(c.matrice.map((m) => m.label)).toEqual(["Pluie", "Chaleur", "Humidité du sol", "Végétation"]);
    expect(c.indicateurs).toHaveLength(5);
    expect(c.alertes.length).toBeGreaterThanOrEqual(1);
    expect(c.meta?.reel).toEqual(["pluie", "chaleur", "humidité du sol", "végétation", "eau stockée"]);
  });

  it("couches, sources et lexique", () => {
    expect(CouchesSchema.parse(load("couches"))).toHaveLength(4);
    const s = SourcesSchema.parse(load("sources"));
    expect(s.sources).toHaveLength(9);
    expect(s.approches).toHaveLength(4);
    expect(LexiqueSchema.parse(load("lexique"))).toHaveLength(20);
  });

  it("rejette un score hors de 1 à 5", () => {
    const r = rotations()[0];
    expect(() => RotationSchema.parse({ ...r, scores: { ...r.scores, fertilite: 6 } })).toThrow();
  });
});
