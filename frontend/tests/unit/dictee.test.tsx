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
