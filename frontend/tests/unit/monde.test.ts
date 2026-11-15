import { estPoint, idPoint, libellePoint, pointDepuisId } from "@/lib/monde/lieu";
import { lireReverse, localisationDe } from "@/lib/monde/localiser";
import { CULTURES_CI, autresCultures, culturesDuPays, zoneDuPays } from "@/lib/monde/pays";
import { nomCourt, nomZone } from "@/lib/monde/nom";
import { regionParId } from "@/lib/regions";
import { lienFiche, lireLienFiche } from "@/lib/moteur/fiche-lien";
import { culturesCandidates, calculerRotations } from "@/lib/moteur/rotations";
import { DEFAULT_PARCELLE, ParcelleSchema } from "@/lib/parcelle/validate";
import { CULTURES_FICHES, lireClimat } from "../helpers/moteur";

describe("points du monde", () => {
  it("un point = la cellule NASA POWER de 0,5° qui le contient", () => {
    expect(idPoint(14.8, -16.9)).toBe("pt_15.0_-17.0");
    expect(idPoint(38.04, 114.5)).toBe("pt_38.0_114.5");
    expect(idPoint(-0.1, 0.1)).toBe("pt_0.0_0.0");
    expect(pointDepuisId("pt_15.0_-17.0")).toEqual({ lat: 15, lon: -17 });
    expect(pointDepuisId("pt_15.3_-17.0")).toBeNull(); // hors grille
    expect(pointDepuisId("poro")).toBeNull();
    expect(estPoint("pt_95.0_0.0")).toBe(false);
    expect(libellePoint(15, -17)).toBe("15,0° N · 17,0° O");
  });

  it("une région ivoirienne reste une région ; un point du monde devient une « région » calculée", () => {
    expect(regionParId("poro")?.chefLieu).toBe("Korhogo");
    expect(regionParId("pt_15.0_-17.0")).toMatchObject({ lat: 15, lon: -17, nom: "15,0° N · 17,0° O" });
    expect(regionParId("pt_abc")).toBeUndefined();
  });

  it("géocodage inverse : pays, nom du pays et lieu ; repli sur le cadre de la Côte d'Ivoire hors ligne", () => {
    const sn = lireReverse({ address: { country_code: "sn", country: "Sénégal", city: "Thiès" } });
    expect(sn).toEqual({ pays: "SN", nomPays: "Sénégal", lieu: "Thiès" });
    expect(localisationDe(14.8, -16.9, sn)).toEqual({ region: "pt_15.0_-17.0", pays: "SN", nomPays: "Sénégal", lieu: "Thiès" });
    expect(localisationDe(9.45, -5.62, null)).toMatchObject({ region: "poro", pays: "CI" });
    expect(localisationDe(3.87, 11.52, null)).toMatchObject({ region: "pt_4.0_11.5", pays: "ZZ" });
    expect(lireReverse({ error: "Unable to geocode" })).toBeNull();
  });

  it("cultures proposées selon le pays ; la Côte d'Ivoire garde ses 8 cultures", () => {
    expect(culturesDuPays("CI")).toEqual([...CULTURES_CI]);
    expect(culturesDuPays("SN")).toContain("Mil");
    expect(culturesDuPays("SN")).not.toContain("Igname");
    expect(culturesDuPays("CN")).toEqual(expect.arrayContaining(["Riz", "Blé", "Soja"]));
    expect(zoneDuPays("CM")).toBe("Afrique centrale");
    expect(culturesDuPays("ZZ", 50)).toContain("Blé"); // inconnu, latitude tempérée
    expect(culturesDuPays("ZZ", 5)).toContain("Manioc");
    expect(autresCultures("SN")).toContain("Blé");
    expect(autresCultures("SN")).not.toContain("Mil");
  });

  it("le nom affiché est le lieu trouvé sur la carte, ou la région ivoirienne", () => {
    expect(nomZone({ region: "poro" })).toBe("Poro");
    expect(nomCourt({ region: "poro" })).toBe("Korhogo");
    expect(nomZone({ region: "pt_15.0_-17.0", lieu: "Thiès" })).toBe("Thiès");
    expect(nomCourt({ region: "pt_15.0_-17.0" })).toBe("15,0° N · 17,0° O");
  });

  it("une parcelle au Sénégal est valide, et son lien de fiche garde le pays et le lieu", () => {
    const p = { ...DEFAULT_PARCELLE, region: "pt_15.0_-17.0", pays: "SN", lieu: "Thiès", cultures: ["Mil", "Arachide"] };
    expect(ParcelleSchema.safeParse(p).success).toBe(true);
    expect(ParcelleSchema.safeParse({ ...p, region: "pt_15.3_-17.0" }).success).toBe(false);
    const q = new URLSearchParams(lienFiche("B", p).split("?")[1]);
    expect(lireLienFiche(q)).toMatchObject({ region: "pt_15.0_-17.0", pays: "SN", lieu: "Thiès", cultures: ["Mil", "Arachide"] });
  });

  it("les rotations d'une parcelle sahélienne ne proposent que des cultures du Sahel (et celles déjà cultivées)", () => {
    const p = { ...DEFAULT_PARCELLE, region: "pt_15.0_-17.0", pays: "SN", cultures: ["Mil", "Arachide"] };
    const pool = culturesCandidates(p, CULTURES_FICHES).map((c) => c.nom);
    expect(pool).toContain("Mil");
    expect(pool).not.toContain("Igname");
    const r = calculerRotations(p, lireClimat("bounkani"), CULTURES_FICHES)!;
    const sahel = new Set(culturesDuPays("SN"));
    for (const x of r) for (const c of x.sequence) expect(sahel.has(c as never) || p.cultures.includes(c)).toBe(true);
  });
});

import { urlDonnee } from "@/lib/monde/url";
describe("adresse des données d'une zone", () => {
  it("régions ivoiriennes : fichiers du build ; points du monde : calcul à la demande ; pas de projections hors Côte d'Ivoire", () => {
    expect(urlDonnee("climat", "poro")).toBe("/api/climat/poro");
    expect(urlDonnee("saisons", "pt_15.0_-17.0")).toBe("/api/monde/saisons/pt_15.0_-17.0");
    expect(urlDonnee("climat", "pt_15.0_-17.0")).toBe("/api/monde/climat/pt_15.0_-17.0");
    expect(urlDonnee("semis", "pt_15.0_-17.0")).toBe("/api/semis/pt_15.0_-17.0");
    expect(urlDonnee("projections", "pt_15.0_-17.0")).toBeNull();
  });
});
