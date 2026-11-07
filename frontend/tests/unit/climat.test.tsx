import { render, screen, within } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { ClimatSchema } from "@/lib/contract";
import { GraceChart } from "@/components/GraceChart";
import { RainChart } from "@/components/RainChart";
import { NeedParcelle } from "@/components/NeedParcelle";
import { ParcelleProvider } from "@/lib/parcelle/context";
import { RequireParcelle } from "@/components/RequireParcelle";

const climat = ClimatSchema.parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo/climat.json"), "utf8")));

describe("GraceChart", () => {
  it("rend 21 colonnes dont 2 lacunes (2017, 2018)", () => {
    const { container } = render(<GraceChart data={climat.grace} />);
    expect(container.querySelectorAll("[data-annee]")).toHaveLength(21);
    const trous = [...container.querySelectorAll('[data-gap="true"]')].map((e) => e.getAttribute("data-annee"));
    expect(trous).toEqual(["2017", "2018"]);
    expect(screen.getAllByText("Pas de mesure").length).toBeGreaterThan(0);
  });
});

describe("RainChart", () => {
  it("marque les mois de la saison des pluies du contrat", () => {
    const { container } = render(<RainChart mois={climat.pluieMensuelle} saison={climat.saisonPluies} />);
    const barres = [...container.querySelectorAll("[data-mois]")];
    expect(barres).toHaveLength(12);
    const pluie = barres.filter((b) => b.getAttribute("data-saison") === "true").map((b) => b.getAttribute("data-mois"));
    const { debut, fin } = climat.saisonPluies;
    expect(pluie).toEqual(Array.from({ length: fin - debut + 1 }, (_, i) => String(debut + i)));
  });
});

describe("RequireParcelle", () => {
  beforeEach(() => localStorage.clear());
  it("propose de revenir à l'étape 1 quand aucune parcelle n'est saisie", async () => {
    render(<ParcelleProvider><RequireParcelle><p>contenu</p></RequireParcelle></ParcelleProvider>);
    expect(await screen.findByText("Commencez par situer votre champ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /étape 1/i })).toHaveAttribute("href", "/parcelle");
    expect(screen.queryByText("contenu")).not.toBeInTheDocument();
  });
  it("affiche le contenu quand la parcelle est saisie", async () => {
    localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: {}, saisie: true }));
    render(<ParcelleProvider><RequireParcelle><p>contenu</p></RequireParcelle></ParcelleProvider>);
    expect(await screen.findByText("contenu")).toBeInTheDocument();
  });
});
