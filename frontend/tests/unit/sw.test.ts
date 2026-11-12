import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

/** Charge public/sw.js dans un faux environnement de service worker et renvoie ses fonctions. */
function chargerSW(opts: { fetch: (r: Request | string) => Promise<Response> }) {
  const stock = new Map<string, Response>();
  const cle = (r: Request | string) => (typeof r === "string" ? new URL(r, "https://forosat.test").href : r.url);
  const cache = {
    put: async (r: Request | string, rep: Response) => void stock.set(cle(r), rep),
    match: async (r: Request | string) => stock.get(cle(r))?.clone(),
    add: async () => undefined,
  };
  const ctx = {
    self: { addEventListener: () => undefined, location: { origin: "https://forosat.test" }, skipWaiting: () => undefined, clients: { claim: () => undefined } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: opts.fetch,
    Response, Request, URL, Promise,
    setTimeout: (f: () => void) => (f(), 0), // le délai réseau expire tout de suite dans le test
    clearTimeout: () => undefined,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../public/sw.js"), "utf8") + ";this.reseauDabord = reseauDabord;", ctx);
  return { reseauDabord: (ctx as unknown as { reseauDabord: (r: Request, s?: string) => Promise<Response> }).reseauDabord, stock };
}

describe("service worker hors connexion", () => {
  it("réseau qui ne répond pas : la copie gardée est servie après le délai", async () => {
    const { reseauDabord, stock } = chargerSW({ fetch: () => new Promise(() => undefined) });
    stock.set("https://forosat.test/api/semis/poro", new Response("garde"));
    const r = await reseauDabord(new Request("https://forosat.test/api/semis/poro"));
    expect(await r.text()).toBe("garde");
  });

  it("erreur serveur (NASA POWER en panne) : la copie gardée remplace la 503", async () => {
    const { reseauDabord, stock } = chargerSW({ fetch: async () => new Response("panne", { status: 503 }) });
    stock.set("https://forosat.test/api/semis/poro", new Response("garde"));
    const r = await reseauDabord(new Request("https://forosat.test/api/semis/poro"));
    expect(await r.text()).toBe("garde");
  });

  it("réseau rapide et réponse correcte : la réponse fraîche est servie et gardée", async () => {
    const { reseauDabord, stock } = chargerSW({ fetch: async () => new Response("frais") });
    const r = await reseauDabord(new Request("https://forosat.test/api/semis/poro"));
    expect(await r.text()).toBe("frais");
    expect(stock.has("https://forosat.test/api/semis/poro")).toBe(true);
  });
});
