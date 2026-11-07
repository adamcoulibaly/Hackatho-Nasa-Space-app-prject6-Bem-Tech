import { render, screen, within } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { RotationsSchema } from "@/lib/contract";
import { RotationCard } from "@/components/RotationCard";
import { CalendrierTrois } from "@/components/CalendrierTrois";
import RotationPage from "@/app/rotations/[id]/page";

const [A, B] = RotationsSchema.parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo/rotations.json"), "utf8")));

describe("RotationCard", () => {
  it("affiche la rotation recommandée avec ses 7 critères, sa lacune et sa confiance", () => {
    render(<RotationCard rotation={B} dark />);
    expect(screen.getByText("Recommandée")).toBeInTheDocument();
    expect(screen.getByText("Maïs")).toBeInTheDocument();
    expect(screen.getAllByText("→")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    expect(screen.getByText(/prix de l'arachide au marché local non intégré/)).toBeInTheDocument();
    expect(screen.getByText("moyenne")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir le détail de la rotation B" })).toHaveAttribute("href", "/rotations/B");
  });
  it("ne marque pas la rotation actuelle comme recommandée", () => {
    render(<RotationCard rotation={A} />);
    expect(screen.queryByText("Recommandée")).not.toBeInTheDocument();
    expect(screen.getByText("Actuelle (exemple)")).toBeInTheDocument();
  });
});

describe("CalendrierTrois", () => {
  it("montre les cultures et le sol nu de chaque année", () => {
    render(<CalendrierTrois calendrier={B.calendrier} />);
    expect(screen.getByText("Niébé de couverture")).toBeInTheDocument();
    expect(screen.getAllByText("Sol nu").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Année [123]$/)).toHaveLength(3);
  });
});

describe("page détail", () => {
  it("renvoie « introuvable » pour une rotation inconnue", async () => {
    await expect(RotationPage({ params: Promise.resolve({ id: "Z" }) })).rejects.toThrow();
  });
});
