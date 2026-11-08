import { AnalysePhotoSchema, analyserPhoto, extraireJson } from "@/lib/ia/vision";
import { comparer } from "@/lib/satellite/comparer";
import { traiterPhoto } from "@/lib/photo/traiter";

const IMAGE = "data:image/jpeg;base64," + "A".repeat(1000);
const CONFIG = { cle: "sk-test", baseUrl: "https://ex.test/v1", modeles: ["texte:free"] };
const reponseModele = (contenu: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content: contenu } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
const ANALYSE = { culture: "Maïs", couvertureSol: 75, etat: "vigoureux", remarque: "Maïs haut et vert, rangs réguliers." } as const;

describe("extraireJson", () => {
  it("lit un JSON nu, en bloc Markdown, ou entouré de texte", () => {
    expect(extraireJson('{"a":1}')).toEqual({ a: 1 });
    expect(extraireJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extraireJson('Voici mon analyse : {"a":3} Merci.')).toEqual({ a: 3 });
    expect(extraireJson("Je ne peux pas analyser cette image.")).toBeNull();
  });
});

describe("AnalysePhotoSchema", () => {
  it("rejette une couverture de 140 % et une culture inconnue", () => {
    expect(AnalysePhotoSchema.safeParse(ANALYSE).success).toBe(true);
    expect(AnalysePhotoSchema.safeParse({ ...ANALYSE, couvertureSol: 140 }).success).toBe(false);
    expect(AnalysePhotoSchema.safeParse({ ...ANALYSE, culture: "Blé" }).success).toBe(false);
  });
});

describe("analyserPhoto", () => {
  it("envoie l'image au modèle de vision et valide sa réponse", async () => {
    let corps: Record<string, unknown> = {};
    const f = (async (_u: string, init: RequestInit) => ((corps = JSON.parse(init.body as string)), reponseModele(JSON.stringify(ANALYSE)))) as typeof fetch;
    const a = await analyserPhoto(IMAGE, { config: CONFIG, modele: "vision:free", fetch: f });
    expect(a).toEqual(ANALYSE);
    expect(corps.model).toBe("vision:free");
    expect(JSON.stringify(corps.messages)).toContain(IMAGE);
    expect(JSON.stringify(corps.messages)).toContain("inconnue");
  });
  it("réponse en prose : null", async () => {
    const f = (async () => reponseModele("Désolé, l'image est floue.")) as typeof fetch;
    expect(await analyserPhoto(IMAGE, { config: CONFIG, modele: "v", fetch: f })).toBeNull();
  });
});

describe("comparer", () => {
  const a = (couvertureSol: number) => ({ ...ANALYSE, couvertureSol });
  it("concordent : végétation dense vue des deux côtés, ou sol nu des deux côtés", () => {
    expect(comparer(a(70), 0.62, 0.55).verdict).toBe("concordent");
    expect(comparer(a(10), 0.21, 0.3).verdict).toBe("concordent");
  });
  it("divergent : les trois raisons possibles, sans trancher", () => {
    const c = comparer(a(15), 0.7, 0.6, "2026-09");
    expect(c.verdict).toBe("divergent");
    expect(c.raisons).toHaveLength(3);
    expect(c.raisons[0]).toContain("environ 1 km");
    expect(c.raisons[1]).toContain("septembre 2026");
    expect(c.raisons[2]).toContain("nuages");
  });
  it("sans image satellite : satellite_indisponible", () => {
    expect(comparer(a(50), null, 0.5).verdict).toBe("satellite_indisponible");
  });
});

describe("traiterPhoto (route /api/photo)", () => {
  const deps = (f: typeof fetch, ndvi = vi.fn(async () => ({ ndvi: 0.64, mois: "2026-09" }))) => ({
    config: CONFIG, modele: "vision:free", fetch: f, ndvi, normale: () => 0.58,
  });
  const ok = (async () => reponseModele(JSON.stringify(ANALYSE))) as typeof fetch;

  it("image trop lourde : 413", async () => {
    const r = await traiterPhoto({ image: "data:image/jpeg;base64," + "A".repeat(2_800_001), lat: 9.4, lon: -5.6, region: "poro" }, deps(ok));
    expect(r.statut).toBe(413);
  });
  it("corps invalide : 400", async () => {
    expect((await traiterPhoto({ image: "pas une image", lat: 9, lon: -5, region: "poro" }, deps(ok))).statut).toBe(400);
    expect((await traiterPhoto({ lat: 9 }, deps(ok))).statut).toBe(400);
  });
  it("modèle qui répond en prose : 422 avec le conseil de reprise", async () => {
    const r = await traiterPhoto({ image: IMAGE, lat: 9.4, lon: -5.6, region: "poro" }, deps((async () => reponseModele("flou")) as typeof fetch));
    expect(r).toEqual({ statut: 422, corps: { erreur: "Analyse impossible, reprenez la photo de plus loin, en plein jour." } });
  });
  it("sans clé : 503", async () => {
    const r = await traiterPhoto({ image: IMAGE, lat: 9.4, lon: -5.6, region: "poro" }, { ...deps(ok), config: { ...CONFIG, cle: undefined } });
    expect(r.statut).toBe(503);
  });
  it("cas complet : analyse, satellite, comparaison ; la position est arrondie à 0,01° avant tout appel", async () => {
    const ndvi = vi.fn(async () => ({ ndvi: 0.64, mois: "2026-09" }));
    const r = await traiterPhoto({ image: IMAGE, lat: 9.45678, lon: -5.62951, region: "poro" }, deps(ok, ndvi));
    expect(r.statut).toBe(200);
    expect(r.corps).toMatchObject({ analyse: ANALYSE, satellite: { ndvi: 0.64, mois: "2026-09", normale: 0.58 }, comparaison: { verdict: "concordent" } });
    expect(ndvi).toHaveBeenCalledWith(9.46, -5.63);
  });
});
