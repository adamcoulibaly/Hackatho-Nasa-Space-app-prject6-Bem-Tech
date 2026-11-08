import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoChamp } from "@/components/PhotoChamp";

const IMAGE = "data:image/jpeg;base64,QUJD";
const reduire = vi.fn(async () => IMAGE);
const duNatif = (m: object) => window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(m) }));
const REPONSE = {
  analyse: { culture: "Maïs", couvertureSol: 70, etat: "vigoureux", remarque: "Maïs haut et vert." },
  satellite: { ndvi: 0.64, mois: "2026-09", normale: 0.58 },
  comparaison: { verdict: "concordent", raisons: [] },
};

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  window.history.pushState({}, "", "/");
  delete (window as any).ReactNativeWebView;
});

describe("PhotoChamp", () => {
  it("prévient avant la prise de vue : photo non enregistrée, position arrondie", () => {
    render(<PhotoChamp region="poro" lat={9.458} lon={-5.63} reduireImage={reduire} />);
    expect(screen.getByText(/n'est pas enregistrée/)).toBeInTheDocument();
    expect(screen.getByText(/arrondie à environ 1 km/)).toBeInTheDocument();
  });

  it("dans le navigateur : choisir une photo l'envoie réduite, puis affiche les deux regards et le verdict", async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify(REPONSE)));
    vi.stubGlobal("fetch", f);
    render(<PhotoChamp region="poro" lat={9.458} lon={-5.63} reduireImage={reduire} />);
    await userEvent.setup().upload(screen.getByLabelText("Photographier mon champ"), new File(["x"], "champ.jpg", { type: "image/jpeg" }));
    await screen.findByText("Ce que voit votre téléphone");
    expect(f.mock.calls[0][0]).toBe("/api/photo");
    expect(JSON.parse(f.mock.calls[0][1]!.body as string)).toEqual({ image: IMAGE, lat: 9.458, lon: -5.63, region: "poro" });
    expect(screen.getByText("Ce que voit la NASA")).toBeInTheDocument();
    expect(screen.getByText(/Maïs haut et vert/)).toBeInTheDocument();
    expect(screen.getByText(/Les deux regards concordent/)).toBeInTheDocument();
  });

  it("erreur 422 : le conseil de reprise s'affiche", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ erreur: "Analyse impossible, reprenez la photo de plus loin, en plein jour." }), { status: 422 })));
    render(<PhotoChamp region="poro" lat={9.458} lon={-5.63} reduireImage={reduire} />);
    await userEvent.setup().upload(screen.getByLabelText("Photographier mon champ"), new File(["x"], "champ.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText(/reprenez la photo de plus loin/)).toBeInTheDocument();
  });

  it("dans l'app : le bouton demande l'appareil photo natif ; un refus est expliqué", async () => {
    const postMessage = vi.fn();
    (window as any).ReactNativeWebView = { postMessage };
    window.history.pushState({}, "", "/parcelle?app=1");
    render(<PhotoChamp region="poro" lat={9.458} lon={-5.63} reduireImage={reduire} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Photographier mon champ" }));
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({ type: "photo" });
    act(() => duNatif({ type: "photo", erreur: "refus" }));
    expect(await screen.findByText(/Appareil photo refusé/)).toBeInTheDocument();
  });

  it("dans l'app : la photo renvoyée par l'app est analysée", async () => {
    (window as any).ReactNativeWebView = { postMessage: vi.fn() };
    window.history.pushState({}, "", "/parcelle?app=1");
    const f = vi.fn(async () => new Response(JSON.stringify(REPONSE)));
    vi.stubGlobal("fetch", f);
    render(<PhotoChamp region="poro" lat={9.458} lon={-5.63} reduireImage={reduire} />);
    act(() => duNatif({ type: "photo", image: IMAGE }));
    await screen.findByText("Ce que voit la NASA");
    await waitFor(() => expect(f).toHaveBeenCalledTimes(1));
  });

  it("sans position : la photo part sans coordonnées et l'écran explique comment comparer au satellite", async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) =>
      new Response(JSON.stringify({ ...REPONSE, satellite: null, comparaison: { verdict: "position_inconnue", raisons: [] } })),
    );
    vi.stubGlobal("fetch", f);
    render(<PhotoChamp region="poro" reduireImage={reduire} />);
    expect(screen.getByText(/Dessinez votre parcelle sur la carte/)).toBeInTheDocument();
    await userEvent.setup().upload(screen.getByLabelText("Photographier mon champ"), new File(["x"], "champ.jpg", { type: "image/jpeg" }));
    await screen.findByText("Ce que voit votre téléphone");
    expect(JSON.parse(f.mock.calls[0][1]!.body as string)).toEqual({ image: IMAGE, region: "poro" });
  });

  it("avec position : le point lu par le satellite est affiché", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(REPONSE))));
    render(<PhotoChamp region="poro" lat={9.458} lon={-5.63} reduireImage={reduire} />);
    await userEvent.setup().upload(screen.getByLabelText("Photographier mon champ"), new File(["x"], "champ.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText(/Point lu : 9,46° N · 5,63° O/)).toBeInTheDocument();
  });
});
