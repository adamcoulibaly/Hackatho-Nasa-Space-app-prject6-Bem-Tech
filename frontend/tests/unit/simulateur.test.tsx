import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getClimatRegion, getCultures, getSaisons } from "@/lib/data";
import { calculerRotations } from "@/lib/moteur/rotations";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";
import { Simulateur } from "@/components/Simulateur";
import { ongletDe } from "@/lib/modeApp";

async function donnees() {
  const [climat, cultures, saisons] = await Promise.all([getClimatRegion("poro"), getCultures(), getSaisons("poro")]);
  const rotations = calculerRotations(DEFAULT_PARCELLE, climat, cultures, saisons)!;
  return { rotations, cultures, saisons };
}

describe("Simulateur", () => {
  it("compare les 3 rotations sur 5 ans par défaut, avec eau, rendement, fertilité, couverture et revenu (hypothèse)", async () => {
    render(<Simulateur {...await donnees()} />);
    expect(screen.getByRole("button", { name: "5 ans" })).toHaveAttribute("aria-pressed", "true");
    const lignes = screen.getAllByTestId("ligne-simulation");
    expect(lignes).toHaveLength(3);
    expect(within(lignes[0]).getByText(/bonnes saisons sur 5/)).toBeInTheDocument();
    expect(within(lignes[0]).getByText(/% du potentiel/)).toBeInTheDocument();
    expect(within(lignes[0]).getByText(/Sol (s'enrichit|stable|s'appauvrit)/)).toBeInTheDocument();
    expect(within(lignes[0]).getByText(/sol couvert/)).toBeInTheDocument();
    expect(within(lignes[0]).getByText(/hypothèse/)).toBeInTheDocument();
    expect(screen.getAllByText("Meilleur équilibre")).toHaveLength(1);
  });

  it("la durée et le scénario changent la simulation", async () => {
    render(<Simulateur {...await donnees()} />);
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "10 ans" }));
    expect(within(screen.getAllByTestId("ligne-simulation")[0]).getByText(/sur 10/)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: /Année sèche \(2025\)/ }));
    expect(screen.getByText(/saison la plus sèche mesurée \(2025/)).toBeInTheDocument();
  });

  it("simulateur visuel : le curseur de date montre la culture, son stade et son état", async () => {
    render(<Simulateur {...await donnees()} />);
    const curseur = screen.getByRole("slider", { name: "Date de la simulation" });
    fireEvent.change(curseur, { target: { value: "190" } });
    expect(screen.getByTestId("etat-du-jour").textContent).toMatch(/Année 1 · juillet/);
    expect(screen.getByTestId("etat-du-jour").textContent).toMatch(/(levée|croissance|floraison|maturité|sol nu)/);
    fireEvent.change(curseur, { target: { value: "5" } });
    expect(screen.getByTestId("etat-du-jour").textContent).toMatch(/sol nu/);
  });

  it("dans l'app mobile, le simulateur s'ouvre dans l'onglet Rotations", () => {
    expect(ongletDe("/simulateur")).toBe("rotations");
  });
});
