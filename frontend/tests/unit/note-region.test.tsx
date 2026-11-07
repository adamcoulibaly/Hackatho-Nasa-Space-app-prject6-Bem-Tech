import { render, screen } from "@testing-library/react";
import { ParcelleProvider } from "@/lib/parcelle/context";
import { NoteRegion } from "@/components/NoteRegion";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";

describe("NoteRegion", () => {
  afterEach(() => localStorage.clear());
  it("hors zone pilote, précise que les rotations sont l'exemple de Korhogo", async () => {
    localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: { ...DEFAULT_PARCELLE, region: "gbeke" }, saisie: true }));
    render(<ParcelleProvider><NoteRegion /></ParcelleProvider>);
    expect(await screen.findByText(/Gbêkê/)).toBeInTheDocument();
    expect(screen.getByText(/exemple calculé pour Korhogo/)).toBeInTheDocument();
  });
  it("dans la zone pilote, ne dit rien", () => {
    render(<ParcelleProvider><NoteRegion /></ParcelleProvider>);
    expect(screen.queryByText(/exemple calculé pour Korhogo/)).not.toBeInTheDocument();
  });
});
