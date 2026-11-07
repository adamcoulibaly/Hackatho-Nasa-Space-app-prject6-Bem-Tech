import { render, screen } from "@testing-library/react";
import { RotationCard } from "@/components/RotationCard";
import { CalendrierTrois } from "@/components/CalendrierTrois";
import RotationPage from "@/app/rotations/[id]/page";
import { rotations } from "../helpers/moteur";

const [A, B] = rotations();

describe("RotationCard", () => {
  it("affiche la rotation recommandée avec ses 7 critères, ses lacunes et sa confiance", () => {
    expect(B.recommandee).toBe(true);
    render(<RotationCard rotation={B} dark />);
    expect(screen.getByText("Recommandée")).toBeInTheDocument();
    expect(screen.getAllByText("→")).toHaveLength(B.sequence.length - 1);
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByText(B.lacune, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(B.confiance.niveau)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir le détail de la rotation B" })).toHaveAttribute("href", "/rotations/B");
  });
  it("ne marque pas la rotation actuelle comme recommandée", () => {
    render(<RotationCard rotation={A} />);
    expect(screen.queryByText("Recommandée")).not.toBeInTheDocument();
    expect(screen.getByText("Actuelle")).toBeInTheDocument();
  });
});

describe("CalendrierTrois", () => {
  it("montre les cultures et le sol nu de chaque année", () => {
    render(<CalendrierTrois calendrier={B.calendrier} />);
    expect(screen.getByText(B.sequence[0])).toBeInTheDocument();
    expect(screen.getAllByText("Sol nu").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Année [123]$/)).toHaveLength(3);
  });
});

describe("page détail", () => {
  it("renvoie « introuvable » pour une rotation inconnue", async () => {
    await expect(RotationPage({ params: Promise.resolve({ id: "Z" }) })).rejects.toThrow();
  });
});
