import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DicteeVocale } from "@/components/DicteeVocale";

afterEach(() => {
  delete (window as any).SpeechRecognition;
  delete (window as any).webkitSpeechRecognition;
});

describe("DicteeVocale", () => {
  it("sans reconnaissance vocale dans le navigateur : pas de bouton, la question reste écrite", () => {
    const { container } = render(<DicteeVocale onTexte={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("dicte la question en français et la transmet comme texte", async () => {
    let instance: any;
    (window as any).webkitSpeechRecognition = class {
      lang = ""; interimResults = true; onresult: any; onend: any; onerror: any;
      constructor() { instance = this; }
      start() {}
      stop() {}
    };
    const onTexte = vi.fn();
    render(<DicteeVocale onTexte={onTexte} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
    expect(instance.lang).toBe("fr-FR");
    act(() => instance.onresult({ results: [[{ transcript: "quand semer le maïs" }]] }));
    expect(onTexte).toHaveBeenCalledWith("quand semer le maïs");
  });
});

describe("DicteeVocale : erreurs et app", () => {
  afterEach(() => {
    delete (window as any).ReactNativeWebView;
    sessionStorage.clear();
  });

  const avecReco = () => {
    let instance: any;
    (window as any).webkitSpeechRecognition = class {
      lang = ""; interimResults = true; onresult: any; onend: any; onerror: any;
      constructor() { instance = this; }
      start() {}
      stop() {}
    };
    return () => instance;
  };

  it("micro refusé, rien entendu, pas de réseau : un message clair, et le bouton redevient utilisable", async () => {
    const inst = avecReco();
    render(<DicteeVocale onTexte={vi.fn()} />);
    const u = userEvent.setup();
    const bouton = screen.getByRole("button", { name: "Poser la question à voix haute" });
    for (const [code, attendu] of [["not-allowed", /Autorisez le micro/], ["no-speech", /rien entendu/], ["network", /connexion internet/]] as const) {
      await u.click(bouton);
      act(() => { inst().onerror({ error: code }); inst().onend(); });
      expect(screen.getByRole("status")).toHaveTextContent(attendu);
      expect(bouton).toHaveTextContent("Dicter");
    }
  });

  it("dans l'app Android : la dictée passe par la reconnaissance vocale du téléphone", async () => {
    const posts: string[] = [];
    (window as any).ReactNativeWebView = { postMessage: (m: string) => posts.push(m) };
    sessionStorage.setItem("forosat.app", "1");
    const onTexte = vi.fn();
    render(<DicteeVocale onTexte={onTexte} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
    expect(JSON.parse(posts[0])).toEqual({ type: "dicter" });
    act(() => { document.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "dictee", texte: "faut-il semer en juin" }) })); });
    expect(onTexte).toHaveBeenCalledWith("faut-il semer en juin");
    await userEvent.setup().click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
    act(() => { document.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "dictee", erreur: "refus" }) })); });
    expect(screen.getByRole("status")).toHaveTextContent(/Autorisez le micro/);
  });
});
