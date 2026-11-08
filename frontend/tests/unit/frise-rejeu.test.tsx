import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Rejeu } from "@/lib/contract";
import { FriseRejeu } from "@/components/FriseRejeu";

const s = (annee: number, culture: string, verdict: "bonne" | "difficile" | "perdue", cause: string, semis: string | null = `${annee}-06-12`) => ({
  annee, culture, verdict, cause, semis, ratio: verdict === "bonne" ? 0.9 : 0.4,
});

const rejeu: Rejeu = {
  saisons: [
    ...Array.from({ length: 18 }, (_, i) => s(2005 + i, "Maïs", "bonne", "eau suffisante tout le cycle")),
    s(2023, "Maïs", "difficile", "pluie insuffisante sur le cycle"),
    s(2024, "Maïs", "perdue", "9 jours secs pendant la floraison du maïs"),
  ],
  bonnes: 18, difficiles: 1, perdues: 1, total: 20,
  pire: s(2024, "Maïs", "perdue", "9 jours secs pendant la floraison du maïs"),
};

describe("FriseRejeu", () => {
  it("résume les saisons et cite la source et l'hypothèse du sol", () => {
    render(<FriseRejeu rejeu={rejeu} />);
    expect(screen.getByText("18 bonnes saisons sur 20")).toBeInTheDocument();
    expect(screen.getByText(/NASA POWER, journalier, 2005–2025/)).toBeInTheDocument();
    expect(screen.getByText(/Hypothèse : réservoir du sol de 100 mm/)).toBeInTheDocument();
    expect(screen.getByText(/moyennée sur environ 50 km/)).toBeInTheDocument();
  });

  it("une pastille par saison, en bouton nommé", () => {
    render(<FriseRejeu rejeu={rejeu} />);
    expect(screen.getAllByRole("button")).toHaveLength(20);
    expect(screen.getByRole("button", { name: "2024 : saison perdue, maïs" })).toBeInTheDocument();
  });

  it("toucher une pastille montre le semis et la cause", async () => {
    render(<FriseRejeu rejeu={rejeu} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "2024 : saison perdue, maïs" }));
    expect(screen.getByText(/semis le 12 juin/i)).toBeInTheDocument();
    expect(screen.getByText(/9 jours secs pendant la floraison du maïs/)).toBeInTheDocument();
  });

  it("par défaut, le détail montre la pire saison", () => {
    render(<FriseRejeu rejeu={rejeu} />);
    expect(screen.getByRole("button", { name: "2024 : saison perdue, maïs" })).toHaveAttribute("aria-pressed", "true");
  });

  it("une saison sans semis le dit", async () => {
    const r = { ...rejeu, saisons: [s(2010, "Riz", "perdue", "pas assez de pluie pour semer", null)], bonnes: 0, difficiles: 0, perdues: 1, total: 1, pire: null };
    render(<FriseRejeu rejeu={r} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "2010 : saison perdue, riz" }));
    expect(screen.getByText(/pas de semis possible/i)).toBeInTheDocument();
  });
});
