import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import { ClimatSchema } from "@/lib/contract";
import { rotations as calculer } from "../helpers/moteur";
import { ClimatTabs } from "@/components/ClimatTabs";
import { Bienvenue } from "@/components/Bienvenue";
import { BottomNav } from "@/components/BottomNav";
import { Tableau } from "@/components/Tableau";

const load = (n: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/regions/${n === "climat" ? "poro" : n}.json`), "utf8"));
const climat = ClimatSchema.parse(load("climat"));
const rotations = calculer();

describe("contrat : onglets et état actuel", () => {
  it("3 onglets réels de 12 valeurs et un état du moment", () => {
    expect(climat.onglets.map((o) => o.id)).toEqual(["pluie", "chaleur", "sol"]);
    for (const o of climat.onglets) expect(o.valeurs).toHaveLength(12);
    expect(climat.actuel!.tuiles).toHaveLength(3);
  });
});

describe("ClimatTabs", () => {
  it("montre la pluie par défaut puis la chaleur au clic", async () => {
    const user = userEvent.setup();
    render(<ClimatTabs onglets={climat.onglets} />);
    expect(screen.getByRole("button", { name: "Pluie" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/^\d+ mm en /)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Chaleur" }));
    expect(screen.getByRole("button", { name: "Chaleur" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/^\d+ °C en /)).toBeInTheDocument();
    expect(screen.getByText(/plus chaud/i)).toBeInTheDocument();
    expect(screen.queryByText(/mm en /)).not.toBeInTheDocument();
  });
});

describe("Bienvenue", () => {
  it("mène à /parcelle pour un agriculteur et à /conseiller pour un conseiller", async () => {
    const user = userEvent.setup();
    render(<Bienvenue />);
    expect(screen.getByRole("link", { name: "Commencer" })).toHaveAttribute("href", "/parcelle");
    await user.click(screen.getByRole("button", { name: /Conseiller/ }));
    expect(screen.getByRole("link", { name: "Commencer" })).toHaveAttribute("href", "/conseiller");
  });
  it("le français est actif, le dioula et le baoulé sont annoncés comme à venir", () => {
    render(<Bienvenue />);
    expect(screen.getByRole("button", { name: "Français" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Dioula/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Baoulé/ })).toBeDisabled();
    expect(screen.getAllByText(/bientôt/i).length).toBeGreaterThanOrEqual(2);
  });
});

describe("BottomNav", () => {
  it("marque la page courante et pointe vers les 4 écrans", () => {
    render(<BottomNav current="climat" />);
    const nav = screen.getByRole("navigation", { name: "Navigation" });
    expect(within(nav).getByRole("link", { name: "Climat" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/tableau");
    expect(within(nav).getByRole("link", { name: "Rotations" })).toHaveAttribute("href", "/rotations");
    expect(within(nav).getByRole("link", { name: "Champ" })).toHaveAttribute("href", "/parcelle");
  });
});

describe("Tableau", () => {
  it("résume la saison, l'état du moment réel et la rotation conseillée", () => {
    render(<Tableau climat={climat} reco={rotations[1]} />);
    expect(screen.getByText(climat.actuel!.titre, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Mesures NASA POWER du/)).toBeInTheDocument();
    expect(screen.getAllByTestId("tuile")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Rotation conseillée/ })).toHaveAttribute("href", "/rotations");
    expect(screen.getByText(rotations[1].sequence.join(" → "))).toBeInTheDocument();
    expect(screen.queryAllByTestId("ndvi-mois")).toHaveLength(0); // végétation pas encore branchée
  });
});
