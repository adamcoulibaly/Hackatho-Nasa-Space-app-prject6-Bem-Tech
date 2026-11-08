import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectionsSchema, type Projections, type Rejeu } from "@/lib/contract";
import { projeter, phrase2050, choisirTient2050 } from "@/lib/moteur/projection";
import { Projection2050 } from "@/components/Projection2050";

const MODELES = ["IPSL-CM6A-LR", "MRI-ESM2-0", "GFDL-ESM4"];

/** Projections où chaque modèle donne un écart (futur − référence) fixé, identique pour toutes les cultures. */
function proj(ecarts245: number[], ecarts585: number[], cultures = ["Maïs", "Niébé", "Sorgho"]): Projections {
  const parModele = (e: number[]) => Object.fromEntries(MODELES.map((m, i) => [m, { reference: 0.8, futur: Math.round((0.8 + e[i]) * 100) / 100 }]));
  return {
    meta: { region: "poro", source: "NASA NEX-GDDP-CMIP6 v2.0 (NCCS)", modeles: MODELES, scenarios: { ssp245: "modéré", ssp585: "pessimiste" }, reference: "1995–2014", futur: "2041–2060" },
    cultures: Object.fromEntries(cultures.map((c) => [c, { ssp245: parModele(ecarts245), ssp585: parModele(ecarts585) }])),
  };
}

const rejeu = (bonnes: number, total = 20): Rejeu => ({ saisons: [], bonnes, difficiles: 0, perdues: total - bonnes, total, pire: null });

describe("projeter", () => {
  it("applique l'écart de chaque modèle à la part réelle et donne la fourchette", () => {
    const p = projeter(["Maïs", "Niébé"], rejeu(18), proj([-0.05, -0.1, -0.05], [-0.2, -0.1, -0.15]))!;
    expect(p.aujourdhui).toBe(18);
    expect(p.total).toBe(20);
    // 0,9 − 0,2 = 0,7 → 14 ; 0,9 − 0,1 = 0,8 → 16
    expect(p.scenarios.ssp585).toEqual({ min: 14, max: 16, desaccord: false });
    expect(p.scenarios.ssp245).toEqual({ min: 16, max: 17, desaccord: false });
  });

  it("borne le résultat entre 0 et le total", () => {
    const p = projeter(["Maïs"], rejeu(19), proj([0.3, 0.3, 0.3], [-0.99, -0.99, -0.99]))!;
    expect(p.scenarios.ssp245.max).toBe(20);
    expect(p.scenarios.ssp585.min).toBe(0);
  });

  it("des écarts de signes opposés au-delà de 5 points : les modèles ne s'accordent pas", () => {
    const p = projeter(["Maïs"], rejeu(15), proj([0.1, -0.1, 0], [0.03, -0.04, 0]))!;
    expect(p.scenarios.ssp245.desaccord).toBe(true);
    expect(p.scenarios.ssp585.desaccord).toBe(false);
  });

  it("sans projection pour les cultures de la rotation : null", () => {
    expect(projeter(["Igname"], rejeu(15), proj([0, 0, 0], [0, 0, 0]))).toBeNull();
  });
});

describe("badge et phrase", () => {
  const p = (min: number, max: number, desaccord = false) => ({ aujourdhui: 18, total: 20, scenarios: { ssp245: { min, max, desaccord }, ssp585: { min, max, desaccord } } });

  it("le badge « tient en 2050 » va à une seule rotation : le plus haut minimum pessimiste", () => {
    expect(choisirTient2050([{ id: "A", projection: p(10, 14) }, { id: "B", projection: p(13, 15) }, { id: "C", projection: p(13, 14) }])).toBe("B");
    expect(choisirTient2050([{ id: "A" }, { id: "B" }])).toBeNull();
  });

  it("la phrase nomme la rotation la plus robuste", () => {
    const t = phrase2050([{ id: "A", sequence: ["Maïs", "Coton"], projection: p(10, 14) }, { id: "C", sequence: ["Sorgho", "Niébé"], projection: p(15, 17) }]);
    expect(t).toMatch(/^La rotation C résiste le mieux au climat de 2050/);
    expect(t).toContain("15 à 17 bonnes saisons sur 20");
  });

  it("si les modèles se contredisent pour la meilleure, la phrase le dit au lieu de trancher", () => {
    expect(phrase2050([{ id: "B", sequence: ["Maïs"], projection: p(12, 18, true) }])).toContain("les modèles ne s'accordent pas");
  });
});

describe("Projection2050", () => {
  const projection = { aujourdhui: 18, total: 20, scenarios: { ssp245: { min: 16, max: 17, desaccord: false }, ssp585: { min: 13, max: 15, desaccord: false } } };

  it("trois barres légendées, l'avertissement et les sources", () => {
    render(<Projection2050 projection={projection} phrase="La rotation B résiste le mieux." />);
    expect(screen.getByText("Projection, pas prévision")).toBeInTheDocument();
    expect(screen.getByText("aujourd'hui (mesuré)")).toBeInTheDocument();
    expect(screen.getByText("vers 2050 — modéré")).toBeInTheDocument();
    expect(screen.getByText("vers 2050 — pessimiste")).toBeInTheDocument();
    expect(screen.getByText(/NEX-GDDP-CMIP6/)).toBeInTheDocument();
    expect(screen.getByText("La rotation B résiste le mieux.")).toBeInTheDocument();
  });

  it("le sélecteur change le scénario mis en avant", async () => {
    render(<Projection2050 projection={projection} phrase="x" />);
    const modere = screen.getByRole("button", { name: "Modéré" });
    const pessimiste = screen.getByRole("button", { name: "Pessimiste" });
    expect(modere).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("barre-ssp245")).toHaveAttribute("data-active", "true");
    await userEvent.setup().click(pessimiste);
    expect(pessimiste).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("barre-ssp585")).toHaveAttribute("data-active", "true");
    expect(screen.getByText(/13 à 15 bonnes saisons sur 20/)).toBeInTheDocument();
  });
});

describe("données des projections", () => {
  const fichier = path.resolve(__dirname, "../../../data/projections/poro.json");
  it.skipIf(!fs.existsSync(fichier))("le fichier réel du Poro respecte le contrat", () => {
    const p = ProjectionsSchema.parse(JSON.parse(fs.readFileSync(fichier, "utf8")));
    expect(Object.keys(p.cultures)).toHaveLength(8);
    expect(Object.keys(p.cultures["Maïs"].ssp585)).toEqual(MODELES);
  });
});

describe("intégration au moteur de rotations", () => {
  it("chaque rotation porte sa projection, une seule a le badge ; sans projections, la lacune le dit", async () => {
    const { calculerRotations } = await import("@/lib/moteur/rotations");
    const { getClimatRegion, getCultures, getSaisons } = await import("@/lib/data");
    const { DEFAULT_PARCELLE } = await import("@/lib/parcelle/validate");
    const [climat, cultures, saisons] = await Promise.all([getClimatRegion("poro"), getCultures(), getSaisons("poro")]);
    const toutes = proj([-0.05, -0.1, 0], [-0.2, -0.1, -0.15], cultures.map((c) => c.nom));
    const avec = calculerRotations(DEFAULT_PARCELLE, climat, cultures, saisons, toutes)!;
    expect(avec.every((r) => r.projection)).toBe(true);
    expect(avec.filter((r) => r.tient2050)).toHaveLength(1);
    const sans = calculerRotations(DEFAULT_PARCELLE, climat, cultures, saisons, null)!;
    expect(sans[0].projection).toBeUndefined();
    expect(sans[0].lacune).toContain("projections 2050 indisponibles");
  });
});

describe("route /api/projections", () => {
  it("fichier absent : 404 au lieu de faire échouer le build", async () => {
    const avant = process.env.FOROSAT_PROJECTIONS_DIR;
    process.env.FOROSAT_PROJECTIONS_DIR = "/dossier/inexistant";
    const { GET } = await import("@/app/api/projections/[region]/route");
    const r = await GET(new Request("http://x/api/projections/poro"), { params: Promise.resolve({ region: "poro" }) });
    expect(r.status).toBe(404);
    process.env.FOROSAT_PROJECTIONS_DIR = avant;
  });
});
