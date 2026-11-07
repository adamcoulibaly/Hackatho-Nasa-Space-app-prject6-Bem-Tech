import fs from "node:fs";
import path from "node:path";
import { CouchesSchema } from "@/lib/contract";
import { gibsTileUrl, anneeDisponible, surfaceHa, nominatimUrl, lireNominatim } from "@/lib/carte";

const couches = CouchesSchema.parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo/couches.json"), "utf8")));
const parId = (id: string) => couches.find((c) => c.id === id)!;

describe("couches NASA GIBS", () => {
  it("le contrat décrit 4 couches réelles", () => {
    expect(couches.map((c) => c.id)).toEqual(["couleurs", "veg", "chaleur", "sol"]);
  });
  it("construit l'adresse de tuile avec la date de l'année choisie", () => {
    expect(gibsTileUrl(parId("veg"), 2018)).toBe(
      "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_NDVI_Monthly/default/2018-08-01/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png",
    );
    expect(gibsTileUrl(parId("couleurs"), 2010)).toMatch(/TrueColor\/default\/2010-01-15\/GoogleMapsCompatible_Level9\/\{z\}\/\{y\}\/\{x\}\.jpg$/);
  });
  it("SMAP n'existe qu'à partir de 2015", () => {
    expect(anneeDisponible(parId("sol"), 2010)).toBe(false);
    expect(anneeDisponible(parId("sol"), 2020)).toBe(true);
    expect(anneeDisponible(parId("veg"), 2005)).toBe(true);
  });
});

describe("surfaceHa", () => {
  it("un carré d'environ 100 m × 100 m vaut environ 1 ha", () => {
    const d = 100 / 111320; // ≈ 100 m en degrés de latitude
    const dLon = d / Math.cos((9.46 * Math.PI) / 180);
    const carre: [number, number][] = [[9.46, -5.63], [9.46 + d, -5.63], [9.46 + d, -5.63 + dLon], [9.46, -5.63 + dLon]];
    expect(surfaceHa(carre)).toBeGreaterThan(0.97);
    expect(surfaceHa(carre)).toBeLessThan(1.03);
  });
  it("le sens du tracé ne change pas la surface", () => {
    const p: [number, number][] = [[9.46, -5.63], [9.47, -5.63], [9.47, -5.62]];
    expect(surfaceHa(p)).toBeCloseTo(surfaceHa([...p].reverse()), 6);
  });
  it("moins de 3 points : surface nulle", () => {
    expect(surfaceHa([[9.46, -5.63], [9.47, -5.63]])).toBe(0);
  });
});

describe("recherche Nominatim", () => {
  it("limite la recherche à la Côte d'Ivoire et encode la requête", () => {
    const u = new URL(nominatimUrl("Bouaké centre"));
    expect(u.origin).toBe("https://nominatim.openstreetmap.org");
    expect(u.searchParams.get("q")).toBe("Bouaké centre");
    expect(u.searchParams.get("countrycodes")).toBe("ci");
    expect(u.searchParams.get("format")).toBe("json");
  });
  it("lit le premier résultat ou renvoie null", () => {
    expect(lireNominatim([{ lat: "9.458", lon: "-5.631", display_name: "Korhogo, Poro" }])).toEqual({ lat: 9.458, lon: -5.631, nom: "Korhogo, Poro" });
    expect(lireNominatim([])).toBeNull();
    expect(lireNominatim({ erreur: 1 })).toBeNull();
  });
});
