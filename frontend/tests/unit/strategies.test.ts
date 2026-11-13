import { getClimatRegion, getCultures, getSaisons } from "@/lib/data";
import { strategies } from "@/lib/moteur/strategies";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";

async function donnees() {
  const [climat, cultures, saisons] = await Promise.all([getClimatRegion("poro"), getCultures(), getSaisons("poro")]);
  return { climat, cultures, saisons };
}

describe("strategies selon les moyens", () => {
  it("trois stratégies : économique, équilibrée, rendement, chacune avec ses contraintes", async () => {
    const { climat, cultures, saisons } = await donnees();
    const s = strategies(DEFAULT_PARCELLE, climat, cultures, saisons)!;
    expect(s.map((x) => x.id)).toEqual(["economique", "equilibree", "rendement"]);
    for (const x of s) {
      expect(x.sequence.length).toBe(3);
      expect(x.contraintes.length).toBeGreaterThan(0);
      expect(x.pourquoi.length).toBeGreaterThan(10);
    }
  });

  it("l'économique demande moins d'intrants que la stratégie rendement", async () => {
    const { climat, cultures, saisons } = await donnees();
    const s = strategies(DEFAULT_PARCELLE, climat, cultures, saisons)!;
    const intrants = (seq: string[]) => seq.reduce((t, c) => t + cultures.find((x) => x.nom === c)!.intrants, 0);
    expect(intrants(s[0].sequence)).toBeLessThanOrEqual(intrants(s[2].sequence));
    expect(s[2].rendementMoyen).toBeGreaterThanOrEqual(s[0].rendementMoyen ?? 0);
  });

  it("avec la daba, l'économique évite les cultures à gros travail du sol", async () => {
    const { climat, cultures, saisons } = await donnees();
    const s = strategies({ ...DEFAULT_PARCELLE, materiel: "daba" }, climat, cultures, saisons)!;
    expect(s[0].sequence.every((c) => cultures.find((x) => x.nom === c)!.travailSol < 4)).toBe(true);
  });

  it("les moyens déclarés désignent la stratégie conseillée", async () => {
    const { climat, cultures, saisons } = await donnees();
    expect(strategies({ ...DEFAULT_PARCELLE, moyens: "faibles" }, climat, cultures, saisons)!.find((x) => x.conseillee)!.id).toBe("economique");
    expect(strategies({ ...DEFAULT_PARCELLE, moyens: "bons" }, climat, cultures, saisons)!.find((x) => x.conseillee)!.id).toBe("rendement");
    expect(strategies(DEFAULT_PARCELLE, climat, cultures, saisons)!.find((x) => x.conseillee)!.id).toBe("equilibree");
  });

  it("chaque fiche culture dit son besoin en intrants, à valider", async () => {
    for (const c of await getCultures()) {
      expect(c.intrants).toBeGreaterThanOrEqual(1);
      expect(c.intrants).toBeLessThanOrEqual(5);
    }
  });
});

describe("Strategies (écran) et formulaire", () => {
  it("trois cartes, la stratégie conseillée pour mes moyens est signalée, avec ses contraintes", async () => {
    const { render, screen, within } = await import("@testing-library/react");
    const { createElement } = await import("react");
    const { StrategiesMoyens } = await import("@/components/StrategiesMoyens");
    const { climat, cultures, saisons } = await donnees();
    const s = strategies({ ...DEFAULT_PARCELLE, moyens: "faibles" }, climat, cultures, saisons)!;
    render(createElement(StrategiesMoyens, { strategies: s }));
    const cartes = screen.getAllByTestId("strategie");
    expect(cartes).toHaveLength(3);
    expect(within(cartes[0]).getByText("Conseillée pour vos moyens")).toBeInTheDocument();
    expect(within(cartes[2]).getByText(/Engrais et semences à acheter/)).toBeInTheDocument();
  });

  it("le formulaire du champ demande mes moyens pour les intrants", async () => {
    const { render, screen } = await import("@testing-library/react");
    const userEvent = (await import("@testing-library/user-event")).default;
    const { createElement } = await import("react");
    const { ParcelleProvider } = await import("@/lib/parcelle/context");
    const { ParcelleForm } = await import("@/components/ParcelleForm");
    localStorage.clear();
    render(createElement(ParcelleProvider, null, createElement(ParcelleForm, { onSubmit: vi.fn() })));
    await userEvent.setup().selectOptions(screen.getByLabelText("Mes moyens pour acheter engrais et semences"), "faibles");
    expect(JSON.parse(localStorage.getItem("forosat.parcelle")!).parcelle.moyens).toBe("faibles");
  });
});
