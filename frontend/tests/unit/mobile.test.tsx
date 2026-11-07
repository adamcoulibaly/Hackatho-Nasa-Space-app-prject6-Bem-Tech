import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fs from "node:fs";
import path from "node:path";
import { ClimatSchema, RotationsSchema } from "@/lib/contract";
import { ClimatTabs } from "@/components/ClimatTabs";
import { Bienvenue } from "@/components/Bienvenue";
import { BottomNav } from "@/components/BottomNav";
import { Tableau } from "@/components/Tableau";

const load = (n: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/pilot/korhogo/${n}.json`), "utf8"));
const climat = ClimatSchema.parse(load("climat"));
const rotations = RotationsSchema.parse(load("rotations"));

describe("contrat : onglets et état actuel", () => {
  it("4 onglets de 12 valeurs et un état actuel", () => {
    expect(climat.onglets.map((o) => o.id)).toEqual(["pluie", "chaleur", "sol", "veg"]);
    for (const o of climat.onglets) expect(o.valeurs).toHaveLength(12);
    expect(climat.actuel.tuiles).toHaveLength(4);
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
    expect(screen.getByText(/harmattan/i)).toBeInTheDocument();
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
  it("résume la saison, 4 tuiles et la rotation conseillée", () => {
    render(<Tableau climat={climat} reco={rotations[1]} />);
    expect(screen.getByText(/Sol nu jusqu'en/)).toBeInTheDocument();
    expect(screen.getAllByTestId("tuile")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /Rotation conseillée/ })).toHaveAttribute("href", "/rotations");
    expect(screen.getByText("Maïs → Arachide → Coton")).toBeInTheDocument();
    expect(screen.getAllByTestId("ndvi-mois")).toHaveLength(12);
  });
});
