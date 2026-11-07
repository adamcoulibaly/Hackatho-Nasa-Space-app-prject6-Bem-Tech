import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import { ClimatSchema, RotationsSchema } from "@/lib/contract";
import { configDepuisEnv, construireMessages, repondre, DemandeSchema } from "@/lib/ia/assistant";
import { AssistantIA } from "@/components/AssistantIA";

const load = (n: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/pilot/korhogo/${n}.json`), "utf8"));
const climat = ClimatSchema.parse(load("climat"));
const [, B] = RotationsSchema.parse(load("rotations"));

const reponseOpenAI = (texte: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content: texte } }] }), { status, headers: { "content-type": "application/json" } });

describe("configuration", () => {
  it("OpenRouter et un modèle gratuit par défaut, sans clé", () => {
    const c = configDepuisEnv({});
    expect(c.cle).toBeUndefined();
    expect(c.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect(c.modele).toMatch(/:free$/);
  });
  it("un autre fournisseur compatible OpenAI se règle par l'environnement", () => {
    const c = configDepuisEnv({ LLM_API_KEY: "k", LLM_BASE_URL: "https://api.groq.com/openai/v1/", LLM_MODEL: "m" });
    expect(c).toEqual({ cle: "k", baseUrl: "https://api.groq.com/openai/v1", modele: "m" });
  });
});

describe("demande", () => {
  it("refuse une rotation inconnue et une question trop longue", () => {
    expect(DemandeSchema.safeParse({ rotationId: "Z" }).success).toBe(false);
    expect(DemandeSchema.safeParse({ rotationId: "B", question: "x".repeat(301) }).success).toBe(false);
    expect(DemandeSchema.safeParse({ rotationId: "B" }).success).toBe(true);
  });
});

describe("construireMessages", () => {
  it("donne à l'IA les faits de la rotation et des règles strictes", () => {
    const m = construireMessages(B, climat, "Quand semer l'arachide ?");
    expect(m[0].role).toBe("system");
    expect(m[0].content).toMatch(/n'invente/i);
    expect(m[0].content).toMatch(/conseiller agricole/i);
    expect(m[1].content).toContain("Maïs → Arachide → Coton");
    expect(m[1].content).toContain(B.lacune);
    expect(m[1].content).toContain("Quand semer l'arachide ?");
  });
  it("sans question, demande une explication simple", () => {
    expect(construireMessages(B, climat)[1].content).toMatch(/Explique simplement/);
  });
});

describe("repondre", () => {
  const ctx = { rotation: B, climat };

  it("sans clé : l'assistant est annoncé comme non configuré (503)", async () => {
    const r = await repondre({ rotationId: "B" }, { ...ctx, config: configDepuisEnv({}), fetch: vi.fn() });
    expect(r).toEqual({ ok: false, statut: 503, erreur: "L'assistant IA n'est pas encore configuré." });
  });

  it("appelle /chat/completions avec la clé et renvoie le texte", async () => {
    const appels: { url: string; init: RequestInit }[] = [];
    const fauxFetch = async (url: string, init: RequestInit) => {
      appels.push({ url, init });
      return reponseOpenAI("  Semez l'arachide en mai.  ");
    };
    const r = await repondre({ rotationId: "B" }, { ...ctx, config: { cle: "sk-test", baseUrl: "https://ex.test/v1", modele: "m:free" }, fetch: fauxFetch as typeof fetch });
    expect(r).toEqual({ ok: true, texte: "Semez l'arachide en mai." });
    expect(appels[0].url).toBe("https://ex.test/v1/chat/completions");
    expect((appels[0].init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect(JSON.parse(appels[0].init.body as string).model).toBe("m:free");
  });

  it("quota dépassé : message clair (502)", async () => {
    const r = await repondre({ rotationId: "B" }, { ...ctx, config: { cle: "k", baseUrl: "https://ex.test/v1", modele: "m" }, fetch: (async () => new Response("{}", { status: 429 })) as typeof fetch });
    expect(r).toEqual({ ok: false, statut: 502, erreur: "L'assistant IA est saturé pour le moment. Réessayez dans une minute." });
  });

  it("réseau en panne ou réponse vide : message clair (502)", async () => {
    const panne = (async () => {
      throw new Error("boom");
    }) as typeof fetch;
    const vide = (async () => reponseOpenAI("   ")) as typeof fetch;
    for (const f of [panne, vide]) {
      const r = await repondre({ rotationId: "B" }, { ...ctx, config: { cle: "k", baseUrl: "https://ex.test/v1", modele: "m" }, fetch: f });
      expect(r).toEqual({ ok: false, statut: 502, erreur: "L'assistant IA ne répond pas pour le moment." });
    }
  });
});

describe("AssistantIA", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("affiche l'explication et rappelle que le score vient des règles", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ texte: "Semez l'arachide en mai." }), { status: 200 })));
    const user = userEvent.setup();
    render(<AssistantIA rotationId="B" />);
    await user.click(screen.getByRole("button", { name: "Expliquer simplement" }));
    expect(await screen.findByText("Semez l'arachide en mai.")).toBeInTheDocument();
    expect(screen.getByText(/le score vient des règles/i)).toBeInTheDocument();
  });

  it("affiche l'erreur du serveur", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ erreur: "L'assistant IA n'est pas encore configuré." }), { status: 503 })));
    const user = userEvent.setup();
    render(<AssistantIA rotationId="B" />);
    await user.type(screen.getByLabelText(/Votre question/), "Et si la pluie s'arrête ?");
    await user.click(screen.getByRole("button", { name: "Demander" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("pas encore configuré"));
  });
});
