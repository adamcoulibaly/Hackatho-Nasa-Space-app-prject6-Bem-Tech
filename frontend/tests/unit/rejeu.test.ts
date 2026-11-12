import fs from "node:fs";
import path from "node:path";
import { SaisonsSchema, type Saisons, type VerdictSaison } from "@/lib/contract";
import { getSaisons, getClimatRegion, getCultures } from "@/lib/data";
import { rejouer } from "@/lib/moteur/rejeu";
import { calculerRotations } from "@/lib/moteur/rotations";
import { confiance } from "@/lib/moteur/explications";
import { extraireClimat } from "@/lib/moteur/climat";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";

const v = (annee: number, verdict: VerdictSaison["verdict"], ratio: number | null, cause = "c"): VerdictSaison => ({
  annee, verdict, semis: verdict === "perdue" && ratio === null ? null : `${annee}-05-10`, ratio, cause,
});

function saisons(cultures: Record<string, VerdictSaison[]>): Saisons {
  return { meta: { region: "poro", source: "NASA POWER (journalier)", periode: "2005–2025", saison: { debut: 5, fin: 10 }, reserveMm: 100 }, cultures };
}

describe("rejouer", () => {
  const s = saisons({
    Maïs: [v(2005, "bonne", 0.9), v(2006, "bonne", 0.9), v(2007, "perdue", 0.3, "9 jours secs pendant la floraison du maïs"), v(2008, "bonne", 0.9)],
    Niébé: [v(2005, "bonne", 0.95), v(2006, "difficile", 0.6), v(2007, "bonne", 0.9)],
  });

  it("alterne les cultures d'une année à l'autre", () => {
    const r = rejouer(["Maïs", "Niébé"], s);
    expect(r.saisons.map((x) => [x.annee, x.culture])).toEqual([[2005, "Maïs"], [2006, "Niébé"], [2007, "Maïs"]]);
  });

  it("compte les saisons et ignore une année absente (cycle hors série)", () => {
    // 2008 : Niébé (indice 3 % 2 = 1) absent de la table → ignoré.
    const r = rejouer(["Maïs", "Niébé"], s);
    expect([r.bonnes, r.difficiles, r.perdues, r.total]).toEqual([1, 1, 1, 3]);
  });

  it("retient la pire saison : une perdue avant une difficile", () => {
    expect(rejouer(["Maïs", "Niébé"], s).pire).toMatchObject({ annee: 2007, culture: "Maïs", verdict: "perdue" });
    expect(rejouer(["Niébé"], s).pire).toMatchObject({ annee: 2006, verdict: "difficile" });
    expect(rejouer(["Niébé"], saisons({ Niébé: [v(2005, "bonne", 1)] })).pire).toBeNull();
  });
});

describe("intégration au moteur de rotations", () => {
  it("la note de sécheresse tient compte des saisons rejouées", async () => {
    const [climat, cultures] = await Promise.all([getClimatRegion("poro"), getCultures()]);
    const p = { ...DEFAULT_PARCELLE, cultures: ["Sorgho", "Niébé"] };
    const toutesPerdues = saisons(Object.fromEntries(cultures.map((c) => [c.nom, Array.from({ length: 20 }, (_, i) => v(2005 + i, "perdue", 0.2))])));
    const sans = calculerRotations(p, climat, cultures)!;
    const avec = calculerRotations(p, climat, cultures, toutesPerdues)!;
    expect(avec[0].scores.secheresse).toBeLessThan(sans[0].scores.secheresse);
    expect(avec[0].rejeu?.perdues).toBe(20);
    expect(sans[0].rejeu).toBeUndefined();
  });

  it("le facteur historique de confiance vient du nombre de saisons rejouées", async () => {
    const cl = extraireClimat(await getClimatRegion("poro"));
    const rejeu = { saisons: [], bonnes: 12, difficiles: 0, perdues: 0, total: 12, pire: null };
    expect(confiance(cl, rejeu).facteurs.historique).toBe(4);
    expect(confiance(cl, { ...rejeu, total: 20 }).facteurs.historique).toBe(5);
    expect(confiance(cl, { ...rejeu, total: 6 }).facteurs.historique).toBe(2);
  });

  it("sans rejeu, la lacune le signale", async () => {
    const [climat, cultures] = await Promise.all([getClimatRegion("poro"), getCultures()]);
    const r = calculerRotations(DEFAULT_PARCELLE, climat, cultures, null)!;
    expect(r[0].lacune).toContain("rejeu des saisons indisponible");
  });
});

describe("données des saisons", () => {
  it("refuse un identifiant de région douteux", async () => {
    await expect(getSaisons("../x")).rejects.toThrow();
  });

  it("le fichier réel du Poro respecte le contrat", () => {
    const brut = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/saisons/poro.json"), "utf8"));
    const s = SaisonsSchema.parse(brut);
    expect(Object.keys(s.cultures)).toHaveLength(8);
    expect(s.cultures["Maïs"].length).toBeGreaterThanOrEqual(18);
  });
});

describe("useRotations charge les saisons de la région", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("avec les saisons : chaque rotation porte son rejeu", async () => {
    const { renderHook, waitFor } = await import("@testing-library/react");
    const { useRotations } = await import("@/lib/useRotations");
    const [climat, cultures, s] = await Promise.all([getClimatRegion("poro"), getCultures(), getSaisons("poro")]);
    const appels: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (appels.push(url), new Response(JSON.stringify(s)))));
    const { result } = renderHook(() => useRotations(climat, cultures, DEFAULT_PARCELLE));
    await waitFor(() => expect(result.current.statut).toBe("pret"));
    expect(appels).toContain("/api/saisons/poro");
    const r = result.current as Extract<typeof result.current, { statut: "pret" }>;
    expect(r.rotations[0].rejeu?.total).toBeGreaterThanOrEqual(18);
  });

  it("si les saisons ne se chargent pas : rotations calculées quand même, lacune signalée", async () => {
    const { renderHook, waitFor } = await import("@testing-library/react");
    const { useRotations } = await import("@/lib/useRotations");
    const [climat, cultures] = await Promise.all([getClimatRegion("poro"), getCultures()]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("non", { status: 500 })));
    const { result } = renderHook(() => useRotations(climat, cultures, DEFAULT_PARCELLE));
    await waitFor(() => expect(result.current.statut).toBe("pret"));
    const r = result.current as Extract<typeof result.current, { statut: "pret" }>;
    expect(r.rotations[0].rejeu).toBeUndefined();
    expect(r.rotations[0].lacune).toContain("rejeu des saisons indisponible");
  });
});

describe("rendement relatif (FAO-33)", () => {
  const s = saisons({
    Maïs: [v(2005, "bonne", 1), v(2006, "difficile", 0.6), v(2007, "perdue", null, "pas assez de pluie pour semer")],
  });
  it("1 − Ky × (1 − eau reçue / eau demandée), borné à 0 ; pas de semis = 0", () => {
    const r = rejouer(["Maïs"], s, { Maïs: 1.25 });
    expect(r.saisons.map((x) => x.rendement)).toEqual([100, 50, 0]);
    expect(r.rendementMoyen).toBe(50);
  });
  it("sans coefficient Ky : pas d'estimation de rendement", () => {
    const r = rejouer(["Maïs"], s);
    expect(r.saisons[0].rendement).toBeUndefined();
    expect(r.rendementMoyen).toBeUndefined();
  });
  it("chaque fiche culture porte son Ky et sa source", async () => {
    const cultures = await getCultures();
    for (const c of cultures) {
      expect(c.ky.valeur).toBeGreaterThan(0);
      expect(c.ky.source).toMatch(/FAO-33|à valider/);
    }
    expect(cultures.find((c) => c.nom === "Maïs")!.ky.valeur).toBe(1.25);
  });
});
