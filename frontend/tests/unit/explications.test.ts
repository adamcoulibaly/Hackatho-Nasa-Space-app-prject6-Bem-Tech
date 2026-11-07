import fs from "node:fs";
import path from "node:path";
import { ClimatSchema, CulturesSchema, RotationSchema, type Climat } from "@/lib/contract";
import { DEFAULT_PARCELLE, type Parcelle } from "@/lib/parcelle/validate";
import { calculerRotations } from "@/lib/moteur/rotations";

const D = path.resolve(__dirname, "../../../");
const climat = ClimatSchema.parse(JSON.parse(fs.readFileSync(path.join(D, "data/regions/poro.json"), "utf8")));
const cultures = CulturesSchema.parse(JSON.parse(fs.readFileSync(path.join(D, "knowledge/cultures.json"), "utf8")));
const p = (x: Partial<Parcelle> = {}): Parcelle => ({ ...DEFAULT_PARCELLE, ...x });
const sansVeg: Climat = { ...climat, onglets: climat.onglets.filter((o) => o.id !== "veg") };

describe("rotations complètes", () => {
  const r = calculerRotations(p(), sansVeg, cultures)!;

  it("les 3 rotations respectent le contrat", () => {
    for (const x of r) expect(() => RotationSchema.parse(x)).not.toThrow();
    expect(r[0].tag).toBe("Actuelle");
    expect(r[0].recommandee).toBe(false);
    expect(r[1].recommandee).toBe(r[1].score > r[0].score);
    expect(r[2].tag).toBe("Alternative");
  });

  it("une légumineuse déclenche la phrase sur l'azote", () => {
    const x = calculerRotations(p({ cultures: ["Maïs", "Arachide", "Coton"] }), sansVeg, cultures)!;
    expect(x[0].pourquoi.join(" ")).toMatch(/Arachide capte l'azote de l'air et le laisse dans le sol pour Coton/);
  });

  it("une culture trop gourmande en eau pour la saison déclenche un risque chiffré", () => {
    const x = calculerRotations(p({ cultures: ["Riz"] }), sansVeg, cultures)!;
    expect(x[0].risques.join(" ")).toMatch(/Riz risque de manquer d'eau : la saison apporte \d+ mm pour un besoin d'au moins 1000 mm/);
  });

  it("la lacune NDVI n'apparaît que si la végétation n'est pas branchée", () => {
    expect(r[0].lacune).toMatch(/végétation \(NDVI\) pas encore branchée/);
    const veg = { id: "veg" as const, label: "Végét.", big: "", source: "MODIS", legende: "", valeurs: Array(12).fill(1), conseil: "" };
    const avec = calculerRotations(p(), { ...climat, onglets: [...sansVeg.onglets, veg] }, cultures)!;
    expect(avec[0].lacune).not.toMatch(/NDVI/);
    expect(r[0].lacune).toMatch(/prix et demande au marché local non intégrés/);
  });

  it("le calendrier couvre chaque mois une seule fois, sur 3 ans", () => {
    for (const x of r) {
      expect(new Set(x.calendrier.map((c) => c.annee))).toEqual(new Set([1, 2, 3]));
      for (const a of [1, 2, 3]) {
        const mois = x.calendrier.filter((c) => c.annee === a).flatMap((c) => Array.from({ length: c.finMois - c.debutMois + 1 }, (_, i) => c.debutMois + i));
        expect(mois.sort((u, v) => u - v)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      }
    }
  });

  it("confiance calculée : moyenne avec 21 ans de données mais sans mesure terrain", () => {
    expect(r[0].confiance).toEqual({ niveau: "moyenne", facteurs: { accordSources: 3, finesse: 1, historique: 5, verification: 1 } });
  });
});
