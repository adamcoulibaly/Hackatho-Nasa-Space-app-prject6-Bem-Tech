import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import { ClimatSchema } from "@/lib/contract";
import { rotations } from "../helpers/moteur";
import { lienFiche } from "@/lib/moteur/fiche-lien";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";
const PARAMS = lienFiche("B", DEFAULT_PARCELLE).split("?")[1];
import { configDepuisEnv, construireMessages, repondre, DemandeSchema } from "@/lib/ia/assistant";
import { MODELES_PAR_DEFAUT } from "@/lib/ia/assistant";
import { AssistantIA } from "@/components/AssistantIA";

const load = (n: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/regions/${n === "climat" ? "poro" : n}.json`), "utf8"));
const climat = ClimatSchema.parse(load("climat"));
const [, B] = rotations();

const reponseOpenAI = (texte: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content: texte } }] }), { status, headers: { "content-type": "application/json" } });

describe("configuration", () => {
  it("OpenRouter et un modèle gratuit par défaut, sans clé", () => {
    const c = configDepuisEnv({});
    expect(c.cle).toBeUndefined();
    expect(c.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect(c.modeles).toEqual(MODELES_PAR_DEFAUT);
  });
  it("un autre fournisseur compatible OpenAI se règle par l'environnement", () => {
    const c = configDepuisEnv({ LLM_API_KEY: "k", LLM_BASE_URL: "https://api.groq.com/openai/v1/", LLM_MODEL: "m1, m2" });
    expect(c).toEqual({ cle: "k", baseUrl: "https://api.groq.com/openai/v1", modeles: ["m1", "m2"] });
  });
});

describe("demande", () => {
  it("refuse un identifiant inconnu, des paramètres trop longs et une question trop longue", () => {
    expect(DemandeSchema.safeParse({ id: "Z", params: PARAMS }).success).toBe(false);
    expect(DemandeSchema.safeParse({ id: "B", params: "x".repeat(501) }).success).toBe(false);
    expect(DemandeSchema.safeParse({ id: "B", params: PARAMS, question: "x".repeat(301) }).success).toBe(false);
    expect(DemandeSchema.safeParse({ id: "B", params: PARAMS }).success).toBe(true);
  });
});

describe("construireMessages", () => {
  it("donne à l'IA les faits de la rotation et des règles strictes", () => {
    const m = construireMessages(B, climat, "Quand semer l'arachide ?");
    expect(m[0].role).toBe("system");
    expect(m[0].content).toMatch(/n'invente/i);
    expect(m[0].content).toMatch(/conseiller agricole/i);
    expect(m[1].content).toContain(B.sequence.join(" → "));
    expect(m[1].content).toContain(B.lacune);
    expect(m[1].content).toContain("Quand semer l'arachide ?");
  });
  it("sans question, demande une explication simple", () => {
    expect(construireMessages(B, climat)[1].content).toMatch(/Explique simplement/);
  });
});

describe("repondre", () => {
  const ctx = { rotation: B, climat };

  it("sans clé : jamais d'erreur, ForoSat répond lui-même à partir de ses données", async () => {
    const r = await repondre({ id: "B", params: PARAMS }, { ...ctx, config: configDepuisEnv({}), fetch: vi.fn() });
    expect(r).toMatchObject({ ok: true, secours: true });
    if (r.ok) expect(r.texte).toContain(B.sequence.join(" → "));
  });

  it("appelle /chat/completions avec la clé et renvoie le texte", async () => {
    const appels: { url: string; init: RequestInit }[] = [];
    const fauxFetch = async (url: string, init: RequestInit) => {
      appels.push({ url, init });
      return reponseOpenAI("  Semez l'arachide en mai.  ");
    };
    const r = await repondre({ id: "B", params: PARAMS }, { ...ctx, config: { cle: "sk-test", baseUrl: "https://ex.test/v1", modeles: ["m:free"] }, fetch: fauxFetch as typeof fetch });
    expect(r).toEqual({ ok: true, texte: "Semez l'arachide en mai." });
    expect(appels[0].url).toBe("https://ex.test/v1/chat/completions");
    expect((appels[0].init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect(JSON.parse(appels[0].init.body as string).model).toBe("m:free");
  });

  it("modèles qui raisonnent : raisonnement court et assez de jetons pour la réponse", async () => {
    let corps: Record<string, unknown> = {};
    const f = (async (_u: string, init: RequestInit) => {
      corps = JSON.parse(init.body as string);
      return reponseOpenAI("Ok.");
    }) as typeof fetch;
    await repondre({ id: "B", params: PARAMS }, { ...ctx, config: { cle: "k", baseUrl: "https://ex.test/v1", modeles: ["m"] }, fetch: f });
    expect(corps.reasoning).toEqual({ effort: "low", exclude: true });
    expect(corps.max_tokens).toBeGreaterThanOrEqual(1500);
  });

  it("chaque échec du fournisseur est journalisé côté serveur, sans la clé", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = (async () => new Response('{"error":{"message":"No endpoints found"}}', { status: 404 })) as typeof fetch;
    await repondre({ id: "B", params: PARAMS }, { ...ctx, config: { cle: "sk-secret", baseUrl: "https://ex.test/v1", modeles: ["m"] }, fetch: f });
    const journal = warn.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(journal).toContain("m");
    expect(journal).toContain("404");
    expect(journal).toContain("No endpoints found");
    expect(journal).not.toContain("sk-secret");
    warn.mockRestore();
  });

  it("si le premier modèle est saturé, le modèle de secours répond", async () => {
    const modeles: string[] = [];
    const f = (async (_u: string, init: RequestInit) => {
      const m = JSON.parse(init.body as string).model;
      modeles.push(m);
      return m === "a" ? new Response("{}", { status: 429 }) : reponseOpenAI("Réponse du secours.");
    }) as typeof fetch;
    const r = await repondre({ id: "B", params: PARAMS }, { ...ctx, config: { cle: "k", baseUrl: "https://ex.test/v1", modeles: ["a", "b"] }, fetch: f });
    expect(r).toEqual({ ok: true, texte: "Réponse du secours." });
    expect(modeles).toEqual(["a", "b"]);
  });

  it("tous les modèles saturés : pas d'erreur, la réponse de secours ForoSat prend le relais", async () => {
    const r = await repondre({ id: "B", params: PARAMS }, { ...ctx, config: { cle: "k", baseUrl: "https://ex.test/v1", modeles: ["m"] }, fetch: (async () => new Response("{}", { status: 429 })) as typeof fetch });
    expect(r).toMatchObject({ ok: true, secours: true });
  });

  it("réseau en panne ou réponse vide : la réponse de secours prend le relais", async () => {
    const panne = (async () => {
      throw new Error("boom");
    }) as typeof fetch;
    const vide = (async () => reponseOpenAI("   ")) as typeof fetch;
    for (const f of [panne, vide]) {
      const r = await repondre({ id: "B", params: PARAMS }, { ...ctx, config: { cle: "k", baseUrl: "https://ex.test/v1", modeles: ["m"] }, fetch: f });
      expect(r).toMatchObject({ ok: true, secours: true });
    }
  });
});

describe("AssistantIA", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("affiche l'explication et rappelle que le score vient des règles", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ texte: "Semez l'arachide en mai." }), { status: 200 })));
    const user = userEvent.setup();
    render(<AssistantIA id="B" parcelle={DEFAULT_PARCELLE} />);
    await user.click(screen.getByRole("button", { name: "Expliquer simplement" }));
    expect(await screen.findByText("Semez l'arachide en mai.")).toBeInTheDocument();
    expect(screen.getByText(/le score vient des règles/i)).toBeInTheDocument();
  });

  it("affiche l'erreur du serveur", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ erreur: "L'assistant IA n'est pas encore configuré." }), { status: 503 })));
    const user = userEvent.setup();
    render(<AssistantIA id="B" parcelle={DEFAULT_PARCELLE} />);
    await user.type(screen.getByLabelText(/Votre question/), "Et si la pluie s'arrête ?");
    await user.click(screen.getByRole("button", { name: "Demander" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("pas encore configuré"));
  });
});

describe("assistant en conversation", () => {
  it("la demande accepte un court historique et indique si la question a été dite à voix haute", () => {
    const h = [{ role: "user", content: "Quand semer ?" }, { role: "assistant", content: "En mai." }];
    expect(DemandeSchema.safeParse({ id: "B", params: PARAMS, question: "Et le coton ?", voix: true, historique: h }).success).toBe(true);
    expect(DemandeSchema.safeParse({ id: "B", params: PARAMS, historique: Array(9).fill(h[0]) }).success).toBe(false);
    expect(DemandeSchema.safeParse({ id: "B", params: PARAMS, historique: [{ role: "system", content: "x" }] }).success).toBe(false);
  });

  it("l'IA reçoit les échanges précédents, et sait qu'une question dictée peut contenir des erreurs de transcription", () => {
    const m = construireMessages(B, climat, "et le coton", [{ role: "user", content: "Quand semer ?" }, { role: "assistant", content: "En mai." }], true);
    const textes = m.map((x) => `${x.role}:${x.content}`);
    expect(textes.some((t) => t === "user:Quand semer ?")).toBe(true);
    expect(textes.some((t) => t === "assistant:En mai.")).toBe(true);
    expect(m.at(-1)!.content).toMatch(/et le coton/);
    expect(m.at(-1)!.content).toMatch(/dictée à voix haute|transcri/);
  });

  it("chaque question s'ajoute au fil de la conversation, et la suivante envoie l'historique", async () => {
    const corps: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
      corps.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ texte: corps.length === 1 ? "En mai." : "Le coton en juin." }));
    }));
    const u = userEvent.setup();
    render(<AssistantIA id="B" parcelle={DEFAULT_PARCELLE} />);
    await u.type(screen.getByLabelText(/Votre question/), "Quand semer ?");
    await u.click(screen.getByRole("button", { name: "Demander" }));
    expect(await screen.findByText("En mai.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Votre question/)).toHaveValue("");
    await u.type(screen.getByLabelText(/Votre question/), "Et le coton ?");
    await u.click(screen.getByRole("button", { name: "Demander" }));
    expect(await screen.findByText("Le coton en juin.")).toBeInTheDocument();
    expect(screen.getByText("Quand semer ?")).toBeInTheDocument();
    expect(corps[1].historique).toEqual([{ role: "user", content: "Quand semer ?" }, { role: "assistant", content: "En mai." }]);
    vi.unstubAllGlobals();
  });

  it("une question dite à voix haute part directement à l'assistant, comme un message de chat", async () => {
    const corps: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
      corps.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ texte: "Semez après 20 mm de pluie." }));
    }));
    const moteur = { nom: "navigateur" as const, demarrer: vi.fn(async () => ({ terminer: async () => "quand semer le maïs", annuler: vi.fn(), surFin: () => undefined })) };
    const u = userEvent.setup();
    render(<AssistantIA id="B" parcelle={DEFAULT_PARCELLE} moteurDictee={moteur} />);
    await u.click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
    await u.click(screen.getByRole("button", { name: /Terminer/ }));
    expect(await screen.findByText("Semez après 20 mm de pluie.")).toBeInTheDocument();
    expect(screen.getByText("quand semer le maïs")).toBeInTheDocument();
    expect(screen.getByText(/à voix haute/)).toBeInTheDocument();
    expect(corps[0]).toMatchObject({ question: "quand semer le maïs", voix: true });
    vi.unstubAllGlobals();
  });
});

describe("comparer les rotations avec l'assistant", () => {
  it("l'IA reçoit aussi les autres rotations de la parcelle, avec leurs saisons réelles, pour comparer", () => {
    const [A, , C] = rotations();
    const m = construireMessages(B, climat, "Compare B et A", [], false, [A, C]);
    const dernier = m.at(-1)!.content;
    expect(dernier).toContain("Autres rotations proposées pour cette parcelle");
    expect(dernier).toContain(`Rotation A`);
    expect(dernier).toContain(A.sequence.join(" → "));
    expect(dernier).toContain(C.sequence.join(" → "));
    expect(m[0].content).toMatch(/compar/i);
  });

  it("la fiche propose de comparer en un toucher avec chacune des autres rotations", async () => {
    const corps: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
      corps.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ texte: "B tient mieux les années sèches que A." }));
    }));
    const u = userEvent.setup();
    render(<AssistantIA id="B" parcelle={DEFAULT_PARCELLE} autres={["A", "C"]} />);
    expect(screen.getByRole("button", { name: "Comparer avec C" })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Comparer avec A" }));
    expect(await screen.findByText("B tient mieux les années sèches que A.")).toBeInTheDocument();
    expect(corps[0].question).toMatch(/rotation B.*rotation A/);
    vi.unstubAllGlobals();
  });
});

describe("réponse de secours ForoSat (aucun modèle ne répond)", () => {
  it("explique la rotation avec ses faits : pourquoi, saisons réelles, 2050, conseiller", async () => {
    const { reponseSecours } = await import("@/lib/ia/secours");
    const t = reponseSecours(B, [], undefined);
    expect(t).toContain(B.sequence.join(" → "));
    expect(t).toContain(B.pourquoi[0]);
    if (B.rejeu?.total) expect(t).toContain(`${B.rejeu.bonnes} bonnes saisons sur ${B.rejeu.total}`);
    expect(t).toMatch(/conseiller agricole/);
  });

  it("compare avec la rotation demandée, et dit laquelle choisir", async () => {
    const { reponseSecours } = await import("@/lib/ia/secours");
    const [A, , C] = rotations();
    const cmp = reponseSecours(B, [A, C], "Compare la rotation B avec la rotation A pour ma parcelle");
    expect(cmp).toMatch(/Rotation B/);
    expect(cmp).toMatch(/Rotation A/);
    const choix = reponseSecours(B, [A, C], "Laquelle choisir ?");
    const conseillee = [A, B, C].find((r) => r.recommandee)!;
    expect(choix).toContain(`rotation ${conseillee.id}`);
  });

  it("l'écran signale discrètement une réponse de secours, sans erreur", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ texte: "Réponse ForoSat.", secours: true }))));
    const u = userEvent.setup();
    render(<AssistantIA id="B" parcelle={DEFAULT_PARCELLE} />);
    await u.click(screen.getByRole("button", { name: "Expliquer simplement" }));
    expect(await screen.findByText("Réponse ForoSat.")).toBeInTheDocument();
    expect(screen.getByText(/préparée par ForoSat/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("une coupure réseau passagère est réessayée une fois automatiquement", async () => {
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      n++;
      if (n === 1) throw new TypeError("Failed to fetch");
      return new Response(JSON.stringify({ texte: "Deuxième essai réussi." }));
    }));
    const u = userEvent.setup();
    render(<AssistantIA id="B" parcelle={DEFAULT_PARCELLE} />);
    await u.click(screen.getByRole("button", { name: "Expliquer simplement" }));
    expect(await screen.findByText("Deuxième essai réussi.", {}, { timeout: 4000 })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe("second fournisseur (Groq) quand OpenRouter est à court", () => {
  it("quota OpenRouter épuisé : Groq répond, sans attendre ; puis OpenRouter est sauté jusqu'au lendemain", async () => {
    const { oublierQuota } = await import("@/lib/ia/assistant");
    oublierQuota();
    const urls: string[] = [];
    const f = (async (u: string, init: RequestInit) => {
      urls.push(u);
      if (u.startsWith("https://openrouter.test")) return new Response(JSON.stringify({ error: { message: "free-models-per-day" } }), { status: 429 });
      expect(JSON.parse(String(init.body)).reasoning).toBeUndefined();
      return reponseOpenAI("Réponse de Groq.");
    }) as typeof fetch;
    const config = { cle: "k", baseUrl: "https://openrouter.test/v1", modeles: ["m"], secours: { cle: "gsk", baseUrl: "https://groq.test/openai/v1", modeles: ["llama"] } };
    const r1 = await repondre({ id: "B", params: PARAMS }, { rotation: B, climat, config, fetch: f });
    expect(r1).toEqual({ ok: true, texte: "Réponse de Groq." });
    urls.length = 0;
    await repondre({ id: "B", params: PARAMS }, { rotation: B, climat, config, fetch: f });
    expect(urls.every((u) => u.startsWith("https://groq.test"))).toBe(true);
    oublierQuota();
  });

  it("la clé Groq (STT_API_KEY ou GROQ_API_KEY) active le second fournisseur", () => {
    const c = configDepuisEnv({ LLM_API_KEY: "k", STT_API_KEY: "gsk" });
    expect(c.secours).toMatchObject({ cle: "gsk", baseUrl: "https://api.groq.com/openai/v1" });
    expect(c.secours!.modeles.length).toBeGreaterThan(0);
    expect(configDepuisEnv({ LLM_API_KEY: "k" }).secours).toBeUndefined();
  });
});

describe("texteBrut", () => {
  it("retire le Markdown qu'un modèle ajouterait : gras, titres, puces en astérisque", async () => {
    const { texteBrut } = await import("@/lib/ia/assistant");
    expect(texteBrut("## Titre\n**Rotation B** est *meilleure*.\n* point un\n- point deux")).toBe("Titre\nRotation B est meilleure.\n- point un\n- point deux");
  });
});
