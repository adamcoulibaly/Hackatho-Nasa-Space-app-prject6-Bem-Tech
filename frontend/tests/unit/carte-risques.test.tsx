import { render, screen, within } from "@testing-library/react";
import { ListeRisques, type RisqueAffiche } from "@/components/ListeRisques";
import { ongletDe } from "@/lib/modeApp";

const regions: RisqueAffiche[] = [
  { id: "poro", nom: "Poro", chefLieu: "Korhogo", lat: 9.45, lon: -5.63, actuel: 0.113, tendance2050: -0.015, score: 0.128, niveau: "moyen" },
  { id: "abidjan", nom: "District autonome d'Abidjan", chefLieu: "Abidjan", lat: 5.32, lon: -4.01, actuel: 0.006, tendance2050: -0.05, score: 0.056, niveau: "faible" },
];

describe("ListeRisques", () => {
  it("classe les régions du plus au moins exposé, avec aujourd'hui et vers 2050", () => {
    render(<ListeRisques regions={regions} />);
    const lignes = screen.getAllByRole("listitem");
    expect(within(lignes[0]).getByText(/Poro/)).toBeInTheDocument();
    expect(within(lignes[0]).getByText("Risque moyen")).toBeInTheDocument();
    expect(within(lignes[0]).getByText(/11 % de saisons perdues aujourd'hui/)).toBeInTheDocument();
    expect(within(lignes[0]).getByText(/−2 points de bonnes saisons vers 2050/)).toBeInTheDocument();
    expect(within(lignes[1]).getByText("Risque faible")).toBeInTheDocument();
  });
  it("dans l'app, la carte des risques s'ouvre dans l'onglet Climat", () => {
    expect(ongletDe("/risques")).toBe("climat");
  });
});
