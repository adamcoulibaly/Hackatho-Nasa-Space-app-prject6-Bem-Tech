import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DicteeVocale } from "@/components/DicteeVocale";
import { moteurServeur, type Enregistreur } from "@/lib/reconnaissance";

function fauxEnregistreur(erreur?: string) {
  const arret = vi.fn(async () => "UklGRaudio");
  const demarrer: Enregistreur = vi.fn(async () => {
    if (erreur) throw Object.assign(new Error(erreur), { name: erreur });
    return { arreter: arret, annuler: vi.fn() };
  });
  return { demarrer, arret };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (navigator as any).mediaDevices;
  delete (window as any).AudioContext;
  delete (window as any).webkitSpeechRecognition;
  delete (window as any).ReactNativeWebView;
  sessionStorage.clear();
});

describe("DicteeVocale : transcription par le serveur", () => {
  it("aucun moyen de dicter : pas de bouton, la question reste écrite", () => {
    const { container } = render(<DicteeVocale onTexte={vi.fn()} moteur={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("toucher Dicter enregistre, toucher Terminer envoie l'audio et transmet le texte", async () => {
    const { demarrer, arret } = fauxEnregistreur();
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ texte: "quand semer le maïs" })));
    const onTexte = vi.fn();
    render(<DicteeVocale onTexte={onTexte} moteur={moteurServeur(demarrer)} />);
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
    await u.click(screen.getByRole("button", { name: /Terminer/ }));
    expect(arret).toHaveBeenCalled();
    expect(f).toHaveBeenCalledWith("/api/dictee", expect.objectContaining({ method: "POST", body: JSON.stringify({ audio: "UklGRaudio" }) }));
    await vi.waitFor(() => expect(onTexte).toHaveBeenCalledWith("quand semer le maïs"));
    expect(screen.getByRole("button", { name: "Poser la question à voix haute" })).toHaveTextContent("Dicter");
  });

  it("micro refusé, rien entendu, serveur en panne : un message clair et le bouton revient", async () => {
    const u = userEvent.setup();
    const { unmount } = render(<DicteeVocale onTexte={vi.fn()} moteur={moteurServeur(fauxEnregistreur("NotAllowedError").demarrer)} />);
    await u.click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Autorisez le micro/);
    unmount();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ texte: "" }))).mockResolvedValueOnce(new Response("{}", { status: 502 }));
    render(<DicteeVocale onTexte={vi.fn()} moteur={moteurServeur(fauxEnregistreur().demarrer)} />);
    for (const attendu of [/rien entendu/, /n'a pas marché/]) {
      await u.click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
      await u.click(screen.getByRole("button", { name: /Terminer/ }));
      await vi.waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(attendu));
      expect(screen.getByRole("button", { name: "Poser la question à voix haute" })).toHaveTextContent("Dicter");
    }
  });

  it("l'enregistrement s'arrête tout seul au bout de 15 secondes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { demarrer, arret } = fauxEnregistreur();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ texte: "ok" })));
    render(<DicteeVocale onTexte={vi.fn()} moteur={moteurServeur(demarrer)} />);
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
    await act(async () => { vi.advanceTimersByTime(15_100); });
    expect(arret).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("DicteeVocale : choix automatique du moyen de transcription", () => {
  it("serveur disponible : c'est lui qui transcrit", async () => {
    (navigator as any).mediaDevices = { getUserMedia: vi.fn() };
    (window as any).AudioContext = class {};
    (window as any).webkitSpeechRecognition = class {};
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ disponible: true })));
    render(<DicteeVocale onTexte={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Poser la question à voix haute" })).toHaveAttribute("data-moteur", "serveur");
  });

  it("serveur indisponible, navigateur avec reconnaissance vocale : le navigateur transcrit, et la fin de la parole envoie le texte", async () => {
    let instance: any;
    (window as any).webkitSpeechRecognition = class {
      lang = ""; continuous = false; interimResults = true; onresult: any; onend: any; onerror: any;
      constructor() { instance = this; }
      start() {}
      stop() { this.onend?.(); }
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ disponible: false })));
    const onTexte = vi.fn();
    render(<DicteeVocale onTexte={onTexte} />);
    const bouton = await screen.findByRole("button", { name: "Poser la question à voix haute" });
    expect(bouton).toHaveAttribute("data-moteur", "navigateur");
    await userEvent.setup().click(bouton);
    expect(instance.lang).toBe("fr-FR");
    act(() => { instance.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: "faut-il semer en juin" }], { isFinal: true })] }); });
    act(() => { instance.onend(); });
    await vi.waitFor(() => expect(onTexte).toHaveBeenCalledWith("faut-il semer en juin"));
  });

  it("dans l'app Android sans serveur : la reconnaissance vocale du téléphone transcrit", async () => {
    const posts: string[] = [];
    (window as any).ReactNativeWebView = { postMessage: (m: string) => posts.push(m) };
    sessionStorage.setItem("forosat.app", "1");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ disponible: false })));
    const onTexte = vi.fn();
    render(<DicteeVocale onTexte={onTexte} />);
    const bouton = await screen.findByRole("button", { name: "Poser la question à voix haute" });
    expect(bouton).toHaveAttribute("data-moteur", "app");
    await userEvent.setup().click(bouton);
    expect(JSON.parse(posts[0])).toEqual({ type: "dicter" });
    act(() => { document.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "dictee", texte: "quand récolter" }) })); });
    await vi.waitFor(() => expect(onTexte).toHaveBeenCalledWith("quand récolter"));
  });

  it("rien de disponible : pas de bouton", async () => {
    (navigator as any).mediaDevices = { getUserMedia: vi.fn() };
    (window as any).AudioContext = class {};
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ disponible: false })));
    const { container } = render(<DicteeVocale onTexte={vi.fn()} />);
    await vi.waitFor(() => expect(f).toHaveBeenCalledWith("/api/dictee"));
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });
});

describe("DicteeVocale : navigateur sans service de reconnaissance", () => {
  it("erreur « network » du navigateur (Samsung Internet, Edge, Brave…) : le message dit d'utiliser Chrome, pas « pas d'internet »", async () => {
    let instance: any;
    (window as any).webkitSpeechRecognition = class {
      lang = ""; continuous = false; interimResults = true; onresult: any; onend: any; onerror: any;
      constructor() { instance = this; }
      start() {}
      stop() { this.onend?.(); }
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ disponible: false })));
    render(<DicteeVocale onTexte={vi.fn()} />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Poser la question à voix haute" }));
    act(() => { instance.onerror({ error: "network" }); instance.onend(); });
    await vi.waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/Chrome/));
    expect(screen.getByRole("status")).not.toHaveTextContent(/connexion internet/);
  });
});
