import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { RotationsSchema } from "@/lib/contract";
import { Fiche } from "@/components/Fiche";

const [, B] = RotationsSchema.parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo/rotations.json"), "utf8")));

describe("Fiche", () => {
  it("dit quoi semer, pourquoi, quoi surveiller, la confiance et que l'avis du conseiller prime", () => {
    render(<Fiche rotation={B} />);
    expect(screen.getByText("Arachide", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(B.pourquoi[0])).toBeInTheDocument();
    expect(screen.getByText(B.risques[1])).toBeInTheDocument();
    expect(screen.getByText(/Confiance : moyenne/)).toBeInTheDocument();
    expect(screen.getByText(/ne remplace pas l'avis d'un conseiller agricole/)).toBeInTheDocument();
  });
});
