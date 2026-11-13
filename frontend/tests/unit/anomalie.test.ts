import { anomalieVegetation } from "@/lib/satellite/anomalie";

describe("anomalieVegetation", () => {
  const aujourdhui = new Date("2026-11-13T00:00:00Z");
  it("compare le dernier mois publié au même mois des 3 années précédentes, au même endroit", async () => {
    const mesures: Record<string, number | null> = { "2026-10": 0.42, "2025-10": 0.6, "2024-10": 0.58, "2023-10": 0.62 };
    const r = await anomalieVegetation(aujourdhui, async (mois) => mesures[mois] ?? null);
    expect(r).toMatchObject({ mois: "2026-10", ndvi: 0.42, habituel: 0.6, ecart: -0.18, anomalie: true });
    expect(r!.message).toMatch(/à vérifier/);
    expect(r!.message).not.toMatch(/maladie/);
  });
  it("écart faible : pas d'anomalie", async () => {
    const r = await anomalieVegetation(aujourdhui, async (mois) => (mois === "2026-10" ? 0.57 : 0.6));
    expect(r!.anomalie).toBe(false);
  });
  it("mois récent pas encore publié : on prend le précédent ; sans historique : null", async () => {
    const r = await anomalieVegetation(aujourdhui, async (mois) => (mois === "2026-10" ? null : 0.5));
    expect(r!.mois).toBe("2026-09");
    expect(await anomalieVegetation(aujourdhui, async (mois) => (mois.startsWith("2026") ? 0.5 : null))).toBeNull();
  });
});

describe("affichage sur l'accueil", () => {
  async function rendre(props: Record<string, unknown>) {
    const { render } = await import("@testing-library/react");
    const { createElement } = await import("react");
    const { Tableau } = await import("@/components/Tableau");
    const { getClimatRegion, getCultures } = await import("@/lib/data");
    const { calculerRotations } = await import("@/lib/moteur/rotations");
    const { DEFAULT_PARCELLE } = await import("@/lib/parcelle/validate");
    const [climat, cultures] = await Promise.all([getClimatRegion("poro"), getCultures()]);
    const reco = calculerRotations(DEFAULT_PARCELLE, climat, cultures)![1];
    return render(createElement(Tableau, { climat, reco, ...props }));
  }
  const semis = { etat: "en_saison" as const, message: "x", dateDonnees: "2026-08-15", risque: "faible" as const, alertes: [] };

  it("une anomalie de végétation s'affiche comme signal à vérifier", async () => {
    const { screen } = await import("@testing-library/react");
    await rendre({ semis, anomalie: { mois: "2026-07", ndvi: 0.42, habituel: 0.6, ecart: -0.18, anomalie: true, message: "Végétation plus faible que d'habitude en juillet : signal à vérifier sur le terrain." } });
    expect(screen.getByText(/signal à vérifier sur le terrain/)).toBeInTheDocument();
  });

  it("les alertes sont présentées comme observées, pas comme une prévision météo", async () => {
    const { screen } = await import("@testing-library/react");
    await rendre({ semis });
    expect(screen.getByText(/Observé jusqu'au 15 août \(NASA POWER\) : ce n'est pas une prévision météo/)).toBeInTheDocument();
  });
});

describe("ndviMois", () => {
  it("lit le NDVI d'un mois précis au point, ou null si la tuile manque", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { ndviMois } = await import("@/lib/satellite/ndvi");
    const tuile = fs.readFileSync(path.resolve(__dirname, "../fixtures/gibs_ndvi_tuile.png"));
    const urls: string[] = [];
    expect(await ndviMois(9.458, -5.6295, "2025-10", async (u) => (urls.push(u), tuile))).toBeCloseTo(0.3389, 4);
    expect(urls[0]).toContain("/2025-10-01/");
    expect(await ndviMois(9.458, -5.6295, "2025-10", async () => null)).toBeNull();
  });
});
