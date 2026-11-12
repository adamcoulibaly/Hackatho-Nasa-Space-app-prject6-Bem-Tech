import type { Projections, Saisons, VerdictSaison } from "@/lib/contract";
import { getProjections, getSaisons } from "@/lib/data";
import { REGIONS } from "@/lib/regions";
import { risqueRegion } from "@/lib/moteur/risques";

const v = (annee: number, verdict: VerdictSaison["verdict"]): VerdictSaison => ({ annee, verdict, semis: null, ratio: null, cause: "" });
const saisons = (verdicts: VerdictSaison["verdict"][]): Saisons => ({
  meta: { region: "x", source: "", periode: "", saison: { debut: 5, fin: 10 }, reserveMm: 100 },
  cultures: { Maïs: verdicts.map((x, i) => v(2005 + i, x)), Sorgho: verdicts.map((x, i) => v(2005 + i, x)) },
});
const proj = (ecart: number): Projections => ({
  meta: { region: "x", source: "", modeles: ["M"], scenarios: { ssp245: "modéré", ssp585: "pessimiste" }, reference: "", futur: "" },
  cultures: { Maïs: { ssp245: { M: { reference: 0.8, futur: 0.8 } }, ssp585: { M: { reference: 0.8, futur: 0.8 + ecart } } }, Sorgho: { ssp245: { M: { reference: 0.8, futur: 0.8 } }, ssp585: { M: { reference: 0.8, futur: 0.8 + ecart } } } },
});

describe("risqueRegion", () => {
  it("aujourd'hui : part des saisons perdues, une difficile comptant pour moitié", () => {
    const r = risqueRegion(saisons(["bonne", "bonne", "perdue", "difficile"]), proj(0));
    expect(r.actuel).toBeCloseTo(0.375, 3);
    expect(r.tendance2050).toBe(0);
  });

  it("vers 2050 : l'écart pessimiste moyen des modèles aggrave ou allège le risque", () => {
    expect(risqueRegion(saisons(["bonne", "bonne", "bonne", "bonne"]), proj(-0.2)).tendance2050).toBeCloseTo(-0.2, 3);
  });

  it("niveau faible, moyen ou élevé selon le risque d'aujourd'hui aggravé par 2050", () => {
    expect(risqueRegion(saisons(Array(20).fill("bonne")), proj(0)).niveau).toBe("faible");
    expect(risqueRegion(saisons([...Array(16).fill("bonne"), ...Array(4).fill("perdue")]), proj(0)).niveau).toBe("moyen");
    expect(risqueRegion(saisons([...Array(12).fill("bonne"), ...Array(8).fill("perdue")]), proj(-0.1)).niveau).toBe("eleve");
  });

  it("sans projections : risque d'aujourd'hui seul", () => {
    expect(risqueRegion(saisons(["bonne", "perdue"]), null).tendance2050).toBeNull();
  });

  it("toutes les régions réelles ont un niveau", async () => {
    for (const r of REGIONS) {
      const [s, p] = await Promise.all([getSaisons(r.id), getProjections(r.id)]);
      expect(["faible", "moyen", "eleve"]).toContain(risqueRegion(s, p).niveau);
    }
  });
});

describe("niveau d'aujourd'hui et estimation 2050 séparés", () => {
  it("le niveau d'aujourd'hui ne dépend que des pertes mesurées (comme la légende)", () => {
    const r = risqueRegion(saisons([...Array(19).fill("bonne"), "perdue"]), proj(-0.2));
    expect(r.niveau).toBe("faible");
    expect(r.niveau2050).toBe("moyen");
    expect(r.pertes2050).toBeCloseTo(0.25, 3);
  });
});
