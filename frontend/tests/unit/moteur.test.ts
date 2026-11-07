import fs from "node:fs";
import path from "node:path";
import { ClimatSchema, CulturesSchema, type Culture } from "@/lib/contract";
import { DEFAULT_PARCELLE, type Parcelle } from "@/lib/parcelle/validate";
import { extraireClimat } from "@/lib/moteur/climat";
import { noteEauCulture, notesRotation, scorePondere } from "@/lib/moteur/notes";
import { calculerRotations } from "@/lib/moteur/rotations";

const D = path.resolve(__dirname, "../../../");
const climat = ClimatSchema.parse(JSON.parse(fs.readFileSync(path.join(D, "data/regions/poro.json"), "utf8")));
const cultures = CulturesSchema.parse(JSON.parse(fs.readFileSync(path.join(D, "knowledge/cultures.json"), "utf8")));
const parNom = (n: string) => cultures.find((c) => c.nom === n)!;
const cl = extraireClimat(climat);
const p = (x: Partial<Parcelle> = {}): Parcelle => ({ ...DEFAULT_PARCELLE, ...x });

describe("extraireClimat", () => {
  it("résume la saison des pluies principale", () => {
    expect(cl.saison).toEqual(climat.saisonPluies);
    const attendu = climat.pluieMensuelle.slice(cl.saison.debut - 1, cl.saison.fin).reduce((a, b) => a + b, 0);
    expect(cl.pluieSaisonMm).toBe(attendu);
    expect(cl.moisSaison).toBe(cl.saison.fin - cl.saison.debut + 1);
    expect(cl.annees).toBe(21);
  });
});

describe("notes", () => {
  const fausse = (max: number): Culture => ({ ...parNom("Maïs"), eauMm: [max / 2, max] });
  it("eau : besoin faible = 5, besoin supérieur à la pluie = 1, irrigation +1", () => {
    expect(noteEauCulture(fausse(0.5 * cl.pluieSaisonMm), cl, "pluie")).toBe(5);
    expect(noteEauCulture(fausse(1.2 * cl.pluieSaisonMm), cl, "pluie")).toBe(1);
    expect(noteEauCulture(fausse(1.2 * cl.pluieSaisonMm), cl, "irrigation")).toBe(2);
  });
  it("fertilité : une légumineuse et l'alternance des familles améliorent la note", () => {
    const avec = notesRotation([parNom("Maïs"), parNom("Arachide"), parNom("Coton")], cl, "pluie");
    const sans = notesRotation([parNom("Maïs"), parNom("Riz")], cl, "pluie");
    expect(avec.fertilite).toBe(4); // 2 + 1 légumineuse + 1 alternance
    expect(sans.fertilite).toBe(2);
  });
  it("les priorités choisies pèsent 3 fois plus", () => {
    const n = { fertilite: 5, eau: 1, secheresse: 1, revenu: 1, erosion: 1, fourrage: 1, marche: 1 } as const;
    expect(scorePondere(n, ["Rendre mon sol plus fertile"])).toBeCloseTo((15 + 6) / 9, 6);
  });
});

describe("calculerRotations", () => {
  it("A reprend les cultures saisies ; B et C respectent les contraintes", () => {
    const r = calculerRotations(p({ cultures: ["Maïs", "Coton"] }), climat, cultures)!;
    expect(r.map((x) => x.id)).toEqual(["A", "B", "C"]);
    expect(r[0].sequence).toEqual(["Maïs", "Coton"]);
    for (const x of r.slice(1)) {
      const s = x.sequence.map(parNom);
      expect(new Set(x.sequence).size).toBe(3);
      expect(s.some((c) => c.legumineuse)).toBe(true);
      for (let i = 1; i < s.length; i++) expect(s[i].famille).not.toBe(s[i - 1].famille);
    }
    const diff = r[2].sequence.filter((c) => !r[1].sequence.includes(c)).length;
    expect(diff).toBeGreaterThanOrEqual(2);
  });
  it("les priorités changent le résultat dans le bon sens", () => {
    const eau = calculerRotations(p({ priorites: ["Utiliser moins d'eau"] }), climat, cultures)!;
    const rev = calculerRotations(p({ priorites: ["Garder un bon revenu"] }), climat, cultures)!;
    expect(eau[1].scores.eau).toBeGreaterThanOrEqual(rev[1].scores.eau);
    expect(rev[1].scores.revenu).toBeGreaterThanOrEqual(eau[1].scores.revenu);
  });
  it("une seule culture : monoculture ; aucune : null", () => {
    expect(calculerRotations(p({ cultures: ["Igname"] }), climat, cultures)![0].sequence).toEqual(["Igname"]);
    expect(calculerRotations(p({ cultures: [] }), climat, cultures)).toBeNull();
  });
  it("est déterministe", () => {
    expect(calculerRotations(p(), climat, cultures)).toEqual(calculerRotations(p(), climat, cultures));
  });
  it("au travail à la daba, évite les cultures exigeantes en travail du sol", () => {
    const r = calculerRotations(p({ materiel: "daba" }), climat, cultures)!;
    for (const n of r[1].sequence) expect(parNom(n).travailSol).toBeLessThan(4);
  });
});

describe("adaptation à la région", () => {
  const abidjan = ClimatSchema.parse(JSON.parse(fs.readFileSync(path.join(D, "data/regions/abidjan.json"), "utf8")));
  it("une culture plus longue que la saison des pluies perd des points (sauf irrigation)", () => {
    const courte = { ...cl, moisSaison: 4 };
    const longue = { ...parNom("Maïs"), cycleJours: 240 }; // 8 mois
    expect(noteEauCulture(longue, courte, "pluie")).toBeLessThan(noteEauCulture(parNom("Maïs"), courte, "pluie"));
    expect(noteEauCulture(longue, courte, "irrigation")).toBeGreaterThan(noteEauCulture(longue, courte, "pluie"));
  });
  it("deux régions au climat différent n'ont pas toutes les mêmes alternatives", () => {
    const nord = calculerRotations(p({ priorites: ["Utiliser moins d'eau"] }), climat, cultures)!;
    const sud = calculerRotations(p({ priorites: ["Utiliser moins d'eau"] }), abidjan, cultures)!;
    expect(nord[0].score).not.toBe(sud[0].score);
  });
  it("le cycle se referme sans deux familles identiques (dernière → première)", () => {
    for (const x of calculerRotations(p(), climat, cultures)!.slice(1)) {
      const s = x.sequence.map(parNom);
      expect(s[s.length - 1].famille).not.toBe(s[0].famille);
    }
  });
  it("C propose au moins 2 cultures absentes de B", () => {
    const r = calculerRotations(p(), climat, cultures)!;
    expect(r[2].sequence.filter((c) => !r[1].sequence.includes(c)).length).toBeGreaterThanOrEqual(2);
  });
});
