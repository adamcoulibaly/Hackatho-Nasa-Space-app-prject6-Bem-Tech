import { render, screen } from "@testing-library/react";
import { Fiche } from "@/components/Fiche";
import { rotations } from "../helpers/moteur";

const [, B] = rotations();

describe("Fiche", () => {
  it("dit quoi semer, pourquoi, la confiance et que l'avis du conseiller prime", () => {
    render(<Fiche rotation={B} />);
    expect(screen.getByText(B.sequence[1], { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(B.pourquoi[0])).toBeInTheDocument();
    expect(screen.getByText(/Confiance : moyenne/)).toBeInTheDocument();
    expect(screen.getByText(/ne remplace pas l'avis d'un conseiller agricole/)).toBeInTheDocument();
  });
});
