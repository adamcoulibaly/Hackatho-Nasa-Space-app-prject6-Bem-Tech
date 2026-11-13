import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Saisons, VerdictSaison } from "@/lib/contract";
import { getCultures } from "@/lib/data";
import { enregistrerPrix, lirePrix, rentabilite } from "@/lib/rentabilite";
import { Rentabilite } from "@/components/Rentabilite";

const v = (annee: number, ratio: number): VerdictSaison => ({ annee, verdict: "bonne", semis: `${annee}-05-20`, ratio, cause: "" });
const saisons: Saisons = {
  meta: { region: "poro", source: "", periode: "", saison: { debut: 5, fin: 10 }, reserveMm: 100 },
  cultures: { Maïs: [v(2020, 1), v(2021, 0.8)], Niébé: [v(2020, 1), v(2021, 1)] },
};
const prix = {
  Maïs: { prixKg: 150, recolteKgHa: 2000, chargesHa: 120000, date: "2026-11-10" },
  Niébé: { prixKg: 500, recolteKgHa: 800, chargesHa: 60000, date: "2026-11-10" },
};

describe("rentabilite", () => {
  it("recette = surface × récolte habituelle × rendement relatif moyen des saisons réelles × prix ; marge = recette − dépenses", async () => {
    const cultures = await getCultures();
    const r = rentabilite(["Maïs", "Niébé"], prix, saisons, cultures, 2);
    // Maïs : Ky 1,25 → rendements 100 % et 75 % → moyenne 87,5 %.
    expect(r.parCulture[0]).toMatchObject({ culture: "Maïs", rendement: 88, recette: 2 * 2000 * 0.875 * 150, marge: 2 * 2000 * 0.875 * 150 - 2 * 120000 });
    expect(r.parCulture[1]).toMatchObject({ culture: "Niébé", recette: 2 * 800 * 1 * 500 });
    expect(r.margeMoyenneAn).toBe(Math.round((r.parCulture[0].marge + r.parCulture[1].marge) / 2));
    expect(r.manquants).toEqual([]);
  });

  it("une culture sans prix saisi est signalée, pas inventée", async () => {
    const r = rentabilite(["Maïs", "Coton"], prix, saisons, await getCultures(), 1);
    expect(r.manquants).toEqual(["Coton"]);
    expect(r.margeMoyenneAn).toBeNull();
  });

  it("les prix restent sur le téléphone, datés", () => {
    localStorage.clear();
    enregistrerPrix("Maïs", { prixKg: 150, recolteKgHa: 2000, chargesHa: 120000 }, "2026-11-10");
    expect(lirePrix()).toEqual({ Maïs: { prixKg: 150, recolteKgHa: 2000, chargesHa: 120000, date: "2026-11-10" } });
  });
});

describe("Rentabilite (écran)", () => {
  it("demande mes prix, puis affiche la marge de chaque rotation avec la date des prix", async () => {
    localStorage.clear();
    const cultures = await getCultures();
    const u = userEvent.setup();
    render(<Rentabilite rotations={[{ id: "A", sequence: ["Maïs"] }, { id: "B", sequence: ["Maïs", "Niébé"] }]} saisons={saisons} cultures={cultures} surface={1} aujourdhui="2026-11-10" />);
    expect(screen.getByText(/Saisissez vos prix/)).toBeInTheDocument();
    const maïs = screen.getByRole("group", { name: "Maïs" });
    await u.type(within(maïs).getByLabelText(/Prix au marché/), "150");
    await u.type(within(maïs).getByLabelText(/Récolte habituelle/), "2000");
    await u.type(within(maïs).getByLabelText(/Dépenses/), "120000");
    await u.click(within(maïs).getByRole("button", { name: "Enregistrer" }));
    const ligneA = screen.getByTestId("rentabilite-A");
    expect(within(ligneA).getByText(/FCFA par an/)).toBeInTheDocument();
    expect(within(ligneA).getByText(/prix du 10 novembre 2026/)).toBeInTheDocument();
    expect(within(screen.getByTestId("rentabilite-B")).getByText(/Prix manquant : Niébé/)).toBeInTheDocument();
  });
});
