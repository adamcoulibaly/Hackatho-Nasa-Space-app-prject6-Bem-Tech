import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DicteeVocale, type Enregistreur } from "@/components/DicteeVocale";

function fauxEnregistreur(erreur?: string) {
  const arret = vi.fn(async () => "UklGRaudio");
  const demarrer: Enregistreur = vi.fn(async () => {
    if (erreur) throw Object.assign(new Error(erreur), { name: erreur });
    return { arreter: arret, annuler: vi.fn() };
  });
  return { demarrer, arret };
}

afterEach(() => vi.restoreAllMocks());

describe("DicteeVocale", () => {
  it("sans micro sur l'appareil : pas de bouton, la question reste écrite", () => {
    const { container } = render(<DicteeVocale onTexte={vi.fn()} enregistrer={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("toucher Dicter enregistre, toucher Terminer envoie l'audio et écrit la question", async () => {
    const { demarrer, arret } = fauxEnregistreur();
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ texte: "quand semer le maïs" })));
    const onTexte = vi.fn();
    render(<DicteeVocale onTexte={onTexte} enregistrer={demarrer} />);
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
    expect(screen.getByRole("button", { name: /Terminer/ })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /Terminer/ }));
    expect(arret).toHaveBeenCalled();
    expect(f).toHaveBeenCalledWith("/api/dictee", expect.objectContaining({ method: "POST", body: JSON.stringify({ audio: "UklGRaudio" }) }));
    await vi.waitFor(() => expect(onTexte).toHaveBeenCalledWith("quand semer le maïs"));
    expect(screen.getByRole("button", { name: "Poser la question à voix haute" })).toHaveTextContent("Dicter");
  });

  it("micro refusé, rien entendu, serveur en panne : un message clair et le bouton revient", async () => {
    const u = userEvent.setup();
    const refus = fauxEnregistreur("NotAllowedError");
    const { unmount } = render(<DicteeVocale onTexte={vi.fn()} enregistrer={refus.demarrer} />);
    await u.click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Autorisez le micro/);
    unmount();

    const { demarrer } = fauxEnregistreur();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ texte: "" }))).mockResolvedValueOnce(new Response("{}", { status: 502 }));
    render(<DicteeVocale onTexte={vi.fn()} enregistrer={demarrer} />);
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
    render(<DicteeVocale onTexte={vi.fn()} enregistrer={demarrer} />);
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Poser la question à voix haute" }));
    await act(async () => { vi.advanceTimersByTime(15_100); });
    expect(arret).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
