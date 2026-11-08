import { render, screen, waitFor } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { REGIONS, regionParId, regionLaPlusProche } from "@/lib/regions";
import { ClimatSchema } from "@/lib/contract";
import { ParcelleSchema, DEFAULT_PARCELLE } from "@/lib/parcelle/validate";
import { lireNominatimListe } from "@/lib/carte";
import { RainChart } from "@/components/RainChart";
import { ClimatVue } from "@/components/ClimatVue";
import { ParcelleProvider } from "@/lib/parcelle/context";

const DATA = path.resolve(__dirname, "../../../data");
const lireRegion = (id: string) => ClimatSchema.parse(JSON.parse(fs.readFileSync(path.join(DATA, "regions", `${id}.json`), "utf8")));

describe("régions de Côte d'Ivoire", () => {
  it("31 régions et 2 districts autonomes, identifiants uniques", () => {
    expect(REGIONS).toHaveLength(33);
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(33);
    expect(regionParId("poro")?.chefLieu).toBe("Korhogo");
  });
  it("trouve la région dont le chef-lieu est le plus proche", () => {
    expect(regionLaPlusProche(7.69, -5.03).id).toBe("gbeke");
    expect(regionLaPlusProche(5.33, -4.02).id).toBe("abidjan");
  });
  it("chaque région a un climat conforme au contrat, avec ses saisons", () => {
    for (const r of REGIONS) {
      const c = lireRegion(r.id);
      expect(c.meta?.region).toBe(r.id);
      expect(c.saisons!.length).toBeGreaterThanOrEqual(1);
    }
    expect(lireRegion("abidjan").saisons).toHaveLength(2);
    expect(lireRegion("poro").saisons).toHaveLength(1);
  });
});

describe("parcelle", () => {
  it("la région est un identifiant de la liste", () => {
    expect(ParcelleSchema.safeParse({ ...DEFAULT_PARCELLE, region: "gbeke" }).success).toBe(true);
    expect(ParcelleSchema.safeParse({ ...DEFAULT_PARCELLE, region: "Poro (Korhogo)" }).success).toBe(false);
    expect(DEFAULT_PARCELLE.region).toBe("poro");
  });
});

describe("recherche avec plusieurs résultats", () => {
  it("lit jusqu'à 5 lieux avec leur cadre", () => {
    const l = lireNominatimListe([
      { lat: "7.69", lon: "-5.03", display_name: "Bouaké", boundingbox: ["7.6", "7.8", "-5.1", "-4.9"] },
      { lat: "x", lon: "1", display_name: "invalide" },
    ]);
    expect(l).toEqual([{ lat: 7.69, lon: -5.03, nom: "Bouaké", cadre: [[7.6, -5.1], [7.8, -4.9]] }]);
    expect(lireNominatimListe("pas un tableau")).toEqual([]);
  });
});

describe("RainChart avec deux saisons", () => {
  it("marque les mois des deux saisons", () => {
    const abj = lireRegion("abidjan");
    const { container } = render(<RainChart mois={abj.pluieMensuelle} saisons={abj.saisons!} />);
    const marques = [...container.querySelectorAll('[data-saison="true"]')].map((b) => Number(b.getAttribute("data-mois")));
    const attendus = abj.saisons!.flatMap((s) => Array.from({ length: s.fin - s.debut + 1 }, (_, i) => s.debut + i));
    expect(marques).toEqual(attendus);
  });
});

describe("ClimatVue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("charge le climat de la région choisie", async () => {
    const korhogo = ClimatSchema.parse(JSON.parse(fs.readFileSync(path.join(DATA, "regions", "poro.json"), "utf8")));
    const abidjan = lireRegion("abidjan");
    const appels: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: string) => {
      appels.push(u);
      return new Response(JSON.stringify(abidjan), { status: 200 });
    }));
    localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: { ...DEFAULT_PARCELLE, region: "abidjan" }, saisie: true }));
    render(<ParcelleProvider><ClimatVue initial={korhogo} /></ParcelleProvider>);
    await waitFor(() => expect(screen.getByText(abidjan.indicateurs[1].valeur)).toBeInTheDocument());
    expect(appels).toEqual(["/api/climat/abidjan"]);
    expect(screen.getByText(/NASA POWER, Abidjan/)).toBeInTheDocument();
  });

  it("n'appelle rien pour la zone pilote", async () => {
    const korhogo = ClimatSchema.parse(JSON.parse(fs.readFileSync(path.join(DATA, "regions", "poro.json"), "utf8")));
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: DEFAULT_PARCELLE, saisie: true }));
    render(<ParcelleProvider><ClimatVue initial={korhogo} /></ParcelleProvider>);
    await waitFor(() => expect(screen.getByText(korhogo.indicateurs[1].valeur)).toBeInTheDocument());
    expect(f).not.toHaveBeenCalled();
  });
});
