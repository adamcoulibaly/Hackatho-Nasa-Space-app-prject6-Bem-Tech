import fs from "node:fs";
import path from "node:path";
import { chargerPalette, ndviFenetre, ndviParcelle, positionTuile, PALETTE_NDVI } from "@/lib/satellite/ndvi";

const XML = fs.readFileSync(path.resolve(__dirname, "../../../data/pipeline/fixtures/gibs_ndvi_colormap.xml"), "utf8");
const TUILE = fs.readFileSync(path.resolve(__dirname, "../fixtures/gibs_ndvi_tuile.png"));

describe("palette NDVI (échelle officielle GIBS)", () => {
  it("donne les mêmes valeurs que le pipeline Python", () => {
    const p = chargerPalette(XML);
    expect(p.get("224,218,210")).toBe(0.0526);
    expect(p.get("191,222,119")).toBe(0.3038);
    expect(p.get("57,135,0")).toBe(0.6051);
    expect(p.get("0,26,105")).toBeNull(); // pas de donnée
  });
  it("la palette embarquée est celle du fichier officiel", () => {
    expect(PALETTE_NDVI).toEqual(chargerPalette(XML));
  });
});

describe("positionTuile", () => {
  it("donne la même tuile et le même pixel que le pipeline Python (zoom 7)", () => {
    expect(positionTuile(9.458, -5.6295)).toEqual({ x: 61, y: 60, px: 255, py: 159 });
    expect(positionTuile(5.3204, -4.0161)).toEqual({ x: 62, y: 62, px: 146, py: 27 });
  });
});

describe("ndviFenetre", () => {
  it("moyenne des pixels valides sur 3 × 3", () => {
    expect(ndviFenetre(TUILE, 128, 128, PALETTE_NDVI)).toBeCloseTo(0.7173, 4);
  });
  it("au bord de la tuile, les pixels hors tuile sont ignorés", () => {
    expect(ndviFenetre(TUILE, 255, 159, PALETTE_NDVI)).toBeCloseTo(0.3389, 4);
  });
});

describe("ndviParcelle", () => {
  it("recule d'un mois tant que l'image n'est pas publiée (3 essais au plus)", async () => {
    const urls: string[] = [];
    const lire = async (url: string) => (urls.push(url), urls.length < 3 ? null : TUILE);
    const r = await ndviParcelle(9.458, -5.6295, new Date("2026-11-08T00:00:00Z"), lire);
    expect(r).toEqual({ ndvi: expect.closeTo(0.3389, 4), mois: "2026-08" });
    expect(urls[0]).toContain("/2026-10-01/");
    expect(urls[2]).toContain("/2026-08-01/");
    expect(urls[0]).toContain("/7/60/61.png");
  });
  it("aucune image en 4 mois : null", async () => {
    const lire = vi.fn(async () => null);
    expect(await ndviParcelle(9.458, -5.6295, new Date("2026-11-08T00:00:00Z"), lire)).toBeNull();
    expect(lire).toHaveBeenCalledTimes(4);
  });
});
