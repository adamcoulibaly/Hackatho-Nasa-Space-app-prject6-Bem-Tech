import { render, screen } from "@testing-library/react";
import { Tableau } from "@/components/Tableau";
import { ClimatVue } from "@/components/ClimatVue";
import { ParcelleProvider } from "@/lib/parcelle/context";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";
import { lireClimat, rotations } from "../helpers/moteur";

const korhogo = lireClimat("poro");

describe("végétation réelle (NDVI MODIS via NASA GIBS)", () => {
  it("le climat de Korhogo contient la végétation mesurée", () => {
    expect(korhogo.onglets.map((o) => o.id)).toContain("veg");
    expect(korhogo.meta?.reel).toContain("végétation");
  });
  it("la frise du tableau de bord gradue le NDVI sur toute l'échelle de couleurs", () => {
    const { container } = render(<Tableau climat={korhogo} reco={rotations()[1]} />);
    const cases = screen.getAllByTestId("ndvi-mois").map((c) => (c.firstElementChild as HTMLElement).style.background);
    expect(cases).toHaveLength(12);
    expect(new Set(cases).size).toBeGreaterThanOrEqual(4);
    expect(container.textContent).toMatch(/Végétation, mois par mois/);
  });
  it("la note de l'écran Climat n'annonce plus que l'eau stockée comme manquante", async () => {
    localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: DEFAULT_PARCELLE, saisie: true }));
    render(<ParcelleProvider><ClimatVue initial={korhogo} /></ParcelleProvider>);
    expect(await screen.findByText(/L'eau stockée \(GRACE\) s'affichera/)).toBeInTheDocument();
    expect(screen.queryByText(/La végétation \(NDVI\) et l'eau stockée/)).not.toBeInTheDocument();
    localStorage.clear();
  });
});
