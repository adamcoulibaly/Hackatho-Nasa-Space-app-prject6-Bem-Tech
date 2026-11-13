import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { lireSignalements, texteSignalement, ajouterSignalement } from "@/lib/signalement";
import { Signalement } from "@/components/Signalement";

describe("signalement communautaire", () => {
  beforeEach(() => localStorage.clear());

  it("le message ne contient que la région, la date, le type et la note : aucune donnée personnelle", () => {
    const t = texteSignalement({ type: "ravageurs", note: "Chenilles sur le maïs", region: "Poro (Korhogo)", date: "2026-11-13" });
    expect(t).toMatch(/Poro \(Korhogo\)/);
    expect(t).toMatch(/13 novembre 2026/);
    expect(t).toMatch(/Ravageurs/);
    expect(t).toMatch(/Chenilles sur le maïs/);
    expect(t).not.toMatch(/\d+\.\d{3,}/); // pas de coordonnées GPS
  });

  it("garde l'historique sur le téléphone, le plus récent d'abord, et refuse une note trop longue", () => {
    ajouterSignalement({ type: "ravageurs", note: "", region: "Poro", date: "2026-11-01" });
    ajouterSignalement({ type: "inondation", note: "", region: "Poro", date: "2026-11-10" });
    expect(lireSignalements().map((s) => s.date)).toEqual(["2026-11-10", "2026-11-01"]);
    expect(() => ajouterSignalement({ type: "autre", note: "x".repeat(300), region: "Poro", date: "2026-11-10" })).toThrow();
  });
});

describe("Signalement (écran)", () => {
  beforeEach(() => localStorage.clear());
  it("choisir un type ouvre un partage WhatsApp et l'ajoute à l'historique", async () => {
    const u = userEvent.setup();
    const ouvrir = vi.fn();
    render(<Signalement region="Poro (Korhogo)" aujourdhui="2026-11-13" ouvrir={ouvrir} />);
    await u.click(screen.getByRole("radio", { name: /Maladie suspectée/ }));
    await u.type(screen.getByLabelText(/Ce que vous voyez/), "Taches jaunes");
    await u.click(screen.getByRole("button", { name: /Prévenir sur WhatsApp/ }));
    expect(ouvrir).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/\?text=.*Taches%20jaunes/));
    const historique = screen.getByRole("list", { name: /Mes signalements/ });
    expect(within(historique).getByText(/Maladie suspectée/)).toBeInTheDocument();
  });
});
