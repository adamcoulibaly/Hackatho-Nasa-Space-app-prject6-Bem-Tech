import type { Saisons, VerdictSaison } from "@/lib/contract";
import { getCultures, getSaisons } from "@/lib/data";
import { anneesExtremes, etatAuJour, simuler } from "@/lib/moteur/simulation";

const v = (annee: number, verdict: VerdictSaison["verdict"], ratio: number | null): VerdictSaison => ({
  annee, verdict, semis: ratio === null ? null : `${annee}-05-10`, ratio, cause: verdict === "bonne" ? "eau suffisante tout le cycle" : "pluie insuffisante sur le cycle",
});
const annees = Array.from({ length: 21 }, (_, i) => 2005 + i);
function saisons(): Saisons {
  const parCulture = (f: (a: number) => VerdictSaison) => annees.map(f);
  return {
    meta: {
      region: "poro", source: "NASA POWER (journalier)", periode: "2005–2025", saison: { debut: 5, fin: 10 }, reserveMm: 100,
      pluieSaison: Object.fromEntries(annees.map((a) => [String(a), a === 2015 ? 500 : a === 2018 ? 1200 : 900])),
    },
    cultures: {
      Maïs: parCulture((a) => (a === 2015 ? v(a, "perdue", 0.3) : v(a, "bonne", 0.95))),
      Niébé: parCulture((a) => (a === 2015 ? v(a, "difficile", 0.6) : v(a, "bonne", 1))),
      Coton: parCulture((a) => v(a, "bonne", 0.9)),
    },
  };
}

describe("anneesExtremes", () => {
  it("la saison la plus sèche et la plus pluvieuse viennent de la pluie mesurée", () => {
    expect(anneesExtremes(saisons())).toEqual({ seche: 2015, pluvieuse: 2018 });
  });
});

describe("simuler", () => {
  it("réel sur 5 ans : les 5 dernières saisons mesurées, la rotation tourne chaque année", async () => {
    const cultures = await getCultures();
    const s = simuler(["Maïs", "Niébé"], saisons(), cultures, 5, "reel");
    expect(s.annees.map((a) => [a.annee, a.anneeSource, a.culture])).toEqual([
      [1, 2021, "Maïs"], [2, 2022, "Niébé"], [3, 2023, "Maïs"], [4, 2024, "Niébé"], [5, 2025, "Maïs"],
    ]);
    expect(s.bonnes).toBe(5);
  });

  it("année sèche répétée : chaque année rejoue la saison la plus sèche (2015)", async () => {
    const cultures = await getCultures();
    const s = simuler(["Maïs", "Niébé"], saisons(), cultures, 3, "sec");
    expect(s.annees.every((a) => a.anneeSource === 2015)).toBe(true);
    expect(s.annees.map((a) => a.verdict)).toEqual(["perdue", "difficile", "perdue"]);
    expect(s.rendementMoyen).toBeLessThan(simuler(["Maïs", "Niébé"], saisons(), cultures, 3, "reel").rendementMoyen);
  });

  it("année pluvieuse : rappelle le risque d'érosion pour les cultures peu couvrantes", async () => {
    const cultures = await getCultures();
    const s = simuler(["Coton", "Maïs"], saisons(), cultures, 3, "pluvieux");
    expect(s.annees.every((a) => a.anneeSource === 2018)).toBe(true);
    expect(s.avertissements.join(" ")).toMatch(/érosion/);
  });

  it("fertilité : une légumineuse enrichit le sol, deux céréales de suite l'appauvrissent", async () => {
    const cultures = await getCultures();
    expect(simuler(["Maïs", "Niébé"], saisons(), cultures, 10, "reel").tendanceFertilite).toBe("s'enrichit");
    expect(simuler(["Maïs", "Coton"], saisons(), cultures, 10, "reel").tendanceFertilite).toBe("s'appauvrit");
  });

  it("couverture du sol : part de l'année où une culture couvre le champ", async () => {
    const cultures = await getCultures();
    const s = simuler(["Maïs"], saisons(), cultures, 3, "reel");
    expect(s.couvertureMoyenne).toBe(Math.round((Math.ceil(110 / 30) / 12) * 100));
  });

  it("le revenu reste une hypothèse explicite", async () => {
    const cultures = await getCultures();
    expect(simuler(["Maïs"], saisons(), cultures, 3, "reel").revenu).toMatchObject({ hypothese: true });
  });

  it("fonctionne sur les vraies données du Poro, pour 3, 5 et 10 ans", async () => {
    const [cultures, s] = await Promise.all([getCultures(), getSaisons("poro")]);
    for (const n of [3, 5, 10] as const) {
      const r = simuler(["Coton", "Maïs", "Niébé"], s, cultures, n, "reel");
      expect(r.annees).toHaveLength(n);
      expect(r.rendementMoyen).toBeGreaterThan(0);
    }
  });
});

describe("etatAuJour (simulateur visuel)", () => {
  it("donne la culture, le stade et l'état à une date de la simulation", async () => {
    const cultures = await getCultures();
    const s = simuler(["Maïs", "Niébé"], saisons(), cultures, 3, "reel");
    expect(etatAuJour(s, cultures, 1, 1)).toMatchObject({ stade: "sol_nu" }); // janvier de l'année 1 : avant le semis
    const juillet = etatAuJour(s, cultures, 1, 190);
    expect(juillet.culture).toBe("Maïs");
    expect(["croissance", "floraison"]).toContain(juillet.stade);
    expect(juillet.etat).toBe("bonne croissance");
  });
  it("une saison perdue est montrée comme telle", async () => {
    const cultures = await getCultures();
    const s = simuler(["Maïs"], saisons(), cultures, 1, "sec");
    expect(etatAuJour(s, cultures, 1, 190).etat).toBe("récolte compromise");
  });
});

describe("simuler : notes communes et avertissements propres à la rotation", () => {
  it("la note du scénario est commune, l'avertissement d'érosion ne concerne que la rotation peu couvrante", async () => {
    const cultures = await getCultures();
    const peuCouvrante = simuler(["Coton", "Maïs"], saisons(), cultures, 3, "pluvieux");
    const couvrante = simuler(["Niébé"], saisons(), cultures, 3, "pluvieux");
    expect(peuCouvrante.notes.join(" ")).toMatch(/saison la plus pluvieuse mesurée/);
    expect(couvrante.notes).toEqual(peuCouvrante.notes);
    expect(peuCouvrante.avertissements.join(" ")).toMatch(/érosion/);
    expect(couvrante.avertissements.join(" ")).not.toMatch(/érosion/);
  });
});
