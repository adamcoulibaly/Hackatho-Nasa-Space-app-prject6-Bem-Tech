import { enCascade } from "@/lib/ia/cascade";

const ok = (t: string) => new Response(JSON.stringify({ choices: [{ message: { content: t } }] }), { status: 200 });
const base = { url: "https://ex.test/v1/chat/completions", cle: "k", corps: (m: string) => ({ model: m }) };

describe("enCascade : modèles de secours sans longue attente", () => {
  it("un modèle lent ne bloque pas : le suivant est lancé en relais et sa réponse est prise", async () => {
    const lances: string[] = [];
    let lentAnnule = false;
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      const m = JSON.parse(String(init.body)).model as string;
      lances.push(m);
      if (m === "lent") {
        return new Promise<Response>((_, rej) => init.signal!.addEventListener("abort", () => { lentAnnule = true; rej(new Error("abort")); }));
      }
      return ok(`réponse de ${m}`);
    });
    const debut = Date.now();
    const r = await enCascade({ ...base, famille: "t1", modeles: ["lent", "rapide"], fetch: f as typeof fetch, relanceMs: 40, totalMs: 2000 });
    expect(r).toEqual({ ok: true, texte: "réponse de rapide", modele: "rapide" });
    expect(Date.now() - debut).toBeLessThan(1000);
    expect(lances).toEqual(["lent", "rapide"]);
    expect(lentAnnule).toBe(true);
  });

  it("un échec passe tout de suite au suivant, sans attendre le relais", async () => {
    const f = vi.fn(async (_u: string, init: RequestInit) => (JSON.parse(String(init.body)).model === "a" ? new Response("{}", { status: 503 }) : ok("b")));
    const debut = Date.now();
    const r = await enCascade({ ...base, famille: "t2", modeles: ["a", "b"], fetch: f as typeof fetch, relanceMs: 5000, totalMs: 9000 });
    expect(r).toMatchObject({ ok: true, modele: "b" });
    expect(Date.now() - debut).toBeLessThan(1000);
  });

  it("le dernier modèle qui a répondu passe en premier la fois suivante", async () => {
    const ordre: string[] = [];
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      const m = JSON.parse(String(init.body)).model as string;
      ordre.push(m);
      return m === "x" ? new Response("{}", { status: 500 }) : ok(m);
    });
    await enCascade({ ...base, famille: "t3", modeles: ["x", "y"], fetch: f as typeof fetch });
    ordre.length = 0;
    await enCascade({ ...base, famille: "t3", modeles: ["x", "y"], fetch: f as typeof fetch });
    expect(ordre[0]).toBe("y");
  });

  it("tous en échec ou trop lents : échec dans le délai total, « saturé » si un 429 a été vu", async () => {
    const f = vi.fn(async (_u: string, init: RequestInit) =>
      JSON.parse(String(init.body)).model === "s" ? new Response("{}", { status: 429 }) : new Promise<Response>((_, rej) => init.signal!.addEventListener("abort", () => rej(new Error("abort")))),
    );
    const debut = Date.now();
    const r = await enCascade({ ...base, famille: "t4", modeles: ["s", "lent"], fetch: f as typeof fetch, relanceMs: 20, totalMs: 150 });
    expect(r).toEqual({ ok: false, sature: true });
    expect(Date.now() - debut).toBeLessThan(1000);
  });
});

describe("modèles par défaut", () => {
  it("plusieurs modèles gratuits légers en secours, Nemotron Lightning d'abord", async () => {
    const { MODELES_PAR_DEFAUT } = await import("@/lib/ia/assistant");
    expect(MODELES_PAR_DEFAUT[0]).toBe("nvidia/nemotron-3.5-lightning:free");
    expect(MODELES_PAR_DEFAUT.length).toBeGreaterThanOrEqual(4);
    expect(MODELES_PAR_DEFAUT.every((m) => m.endsWith(":free"))).toBe(true);
  });
});
