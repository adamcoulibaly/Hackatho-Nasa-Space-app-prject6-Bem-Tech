import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HorsLigne } from "@/components/HorsLigne";
import { exigerInternet } from "@/lib/enLigne";
import { AssistantIA } from "@/components/AssistantIA";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";

function horsLigne(v: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => !v });
  act(() => { window.dispatchEvent(new Event(v ? "offline" : "online")); });
}

afterEach(() => horsLigne(false));

describe("hors connexion dans l'app", () => {
  it("bandeau « Vous êtes hors ligne », puis « De nouveau en ligne » au retour", () => {
    render(<HorsLigne />);
    horsLigne(true);
    expect(screen.getByText(/Vous êtes hors ligne/)).toBeInTheDocument();
    horsLigne(false);
    expect(screen.queryByText(/Vous êtes hors ligne/)).not.toBeInTheDocument();
    expect(screen.getByText(/De nouveau en ligne/)).toBeInTheDocument();
  });

  it("exigerInternet : en ligne, laisse faire ; hors ligne, refuse et affiche « connectez-vous à internet pour accéder à … »", () => {
    render(<HorsLigne />);
    expect(exigerInternet("l'assistant IA")).toBe(true);
    horsLigne(true);
    let ok = true;
    act(() => { ok = exigerInternet("l'assistant IA"); });
    expect(ok).toBe(false);
    expect(screen.getByRole("alert")).toHaveTextContent("Désolé, connectez-vous à internet pour accéder à l'assistant IA.");
  });

  it("l'assistant IA n'appelle pas le serveur hors ligne et prévient l'agriculteur", async () => {
    const f = vi.spyOn(globalThis, "fetch");
    render(<><HorsLigne /><AssistantIA id="B" parcelle={DEFAULT_PARCELLE} /></>);
    horsLigne(true);
    await userEvent.setup().click(screen.getByRole("button", { name: "Expliquer simplement" }));
    expect(f).not.toHaveBeenCalled();
    expect(screen.getAllByText(/connectez-vous à internet pour accéder à l'assistant IA/).length).toBeGreaterThan(0);
    f.mockRestore();
  });
});
