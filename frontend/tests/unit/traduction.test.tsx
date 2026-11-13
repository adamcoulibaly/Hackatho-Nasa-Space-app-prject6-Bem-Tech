import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PHRASES, texteContribution } from "@/lib/traduction";
import { Traduire } from "@/components/Traduire";

describe("contribution de traduction", () => {
  it("des phrases clés de l'app, et un message qui n'envoie que les traductions saisies", () => {
    expect(PHRASES.length).toBeGreaterThanOrEqual(10);
    const t = texteContribution("Dioula", { [PHRASES[0].id]: "traduction test" });
    expect(t).toMatch(/Dioula/);
    expect(t).toMatch(new RegExp(PHRASES[0].fr));
    expect(t).toMatch(/traduction test/);
    expect(t).not.toMatch(new RegExp(PHRASES[1].fr));
  });
});

describe("Traduire (écran)", () => {
  beforeEach(() => localStorage.clear());
  it("on choisit sa langue, on traduit une phrase et on l'envoie à l'équipe ; rien n'est inventé", async () => {
    const u = userEvent.setup();
    const ouvrir = vi.fn();
    render(<Traduire ouvrir={ouvrir} />);
    expect(screen.getByText(/n'invente aucune traduction/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Envoyer/ })).toBeDisabled();
    await u.selectOptions(screen.getByLabelText("Ma langue"), "Baoulé");
    await u.type(screen.getByLabelText(PHRASES[0].fr), "essai");
    await u.click(screen.getByRole("button", { name: /Envoyer/ }));
    expect(ouvrir).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/\?text=.*Baoul/));
    expect(JSON.parse(localStorage.getItem("forosat.traduction")!)).toMatchObject({ langue: "Baoulé" });
  });
});
