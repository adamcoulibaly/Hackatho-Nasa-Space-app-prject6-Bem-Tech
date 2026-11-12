import { render, screen } from "@testing-library/react";
import { getClimatRegion } from "@/lib/data";
import { EffetsSurLeSol } from "@/components/EffetsSurLeSol";

describe("EffetsSurLeSol", () => {
  it("4 dessins : pluie sur sol nu ou couvert, chaleur sur sol nu ou paillé", async () => {
    render(<EffetsSurLeSol climat={await getClimatRegion("poro")} />);
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByText(/ruisselle/)).toBeInTheDocument();
    expect(screen.getByText(/s'infiltre/)).toBeInTheDocument();
    expect(screen.getByText(/croûte/)).toBeInTheDocument();
    expect(screen.getByText(/paillage/i)).toBeInTheDocument();
  });

  it("rattache les dessins aux chiffres NASA de la région", async () => {
    const climat = await getClimatRegion("poro");
    render(<EffetsSurLeSol climat={climat} />);
    const max = Math.max(...climat.pluieMensuelle);
    expect(screen.getByText(new RegExp(`${max} mm`))).toBeInTheDocument();
    expect(screen.getByText(/°C de maximum moyen dans l'air/)).toBeInTheDocument();
  });
});
