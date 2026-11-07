import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { ParcelleProvider } from "@/lib/parcelle/context";
import { ParcelleForm } from "@/components/ParcelleForm";
import { RainSimulator } from "@/components/RainSimulator";
import { GraceChart } from "@/components/GraceChart";
import { LexiqueSchema, RotationsSchema, ClimatSchema } from "@/lib/contract";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";
import * as rotationPage from "@/app/rotations/[id]/page";
import * as fichePage from "@/app/fiche/[id]/page";
import RotationsPage from "@/app/rotations/page";

const D = path.resolve(__dirname, "../../../data/pilot/korhogo");
const load = (n: string) => JSON.parse(fs.readFileSync(path.join(D, `${n}.json`), "utf8"));
const rotations = RotationsSchema.parse(load("rotations"));

describe("I-1 : le formulaire reprend la parcelle sauvegardée", () => {
  beforeEach(() => localStorage.clear());
  it("affiche la surface enregistrée après rechargement", async () => {
    localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: { ...DEFAULT_PARCELLE, surface: 7 }, saisie: true }));
    render(<ParcelleProvider><ParcelleForm onSubmit={() => {}} /></ParcelleProvider>);
    await waitFor(() => expect(screen.getByLabelText("Surface (ha)")).toHaveValue(7));
  });
});

describe("I-2 : stockage valide mais de mauvais types", () => {
  beforeEach(() => localStorage.clear());
  it("revient aux valeurs par défaut et nettoie la clé", async () => {
    localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: { priorites: 5, cultures: null }, saisie: true }));
    render(<ParcelleProvider><ParcelleForm onSubmit={() => {}} /></ParcelleProvider>);
    await waitFor(() => expect(screen.getByLabelText("Surface (ha)")).toHaveValue(2));
    expect(screen.getByRole("button", { name: "Maïs" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("forosat.parcelle")).toBeNull();
  });
});

describe("I-3 : égalité dans le simulateur", () => {
  it("dit que les rotations ne se distinguent plus quand tout est au minimum", () => {
    render(<RainSimulator rotations={rotations} courante="B" />);
    fireEvent.change(screen.getByLabelText(/Variation des pluies/), { target: { value: "-30" } });
    fireEvent.change(screen.getByLabelText(/Variation de la chaleur/), { target: { value: "4" } });
    expect(screen.getByText(/ne se distinguent plus/)).toBeInTheDocument();
    expect(screen.queryByText(/résiste le mieux/)).not.toBeInTheDocument();
  });
  it("désigne une seule rotation quand elle domine", () => {
    render(<RainSimulator rotations={rotations} courante="B" />);
    expect(screen.getByText(/résiste le mieux/)).toBeInTheDocument();
  });
});

describe("I-4 : identifiants inconnus", () => {
  it("les routes dynamiques n'acceptent que les identifiants connus", () => {
    expect(rotationPage.dynamicParams).toBe(false);
    expect(fichePage.dynamicParams).toBe(false);
  });
});

describe("I-5 : résultats d'exemple", () => {
  beforeEach(() => localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: DEFAULT_PARCELLE, saisie: true })));
  it("indique que les choix ne modifient pas encore le résultat", async () => {
    render(<ParcelleProvider>{await RotationsPage()}</ParcelleProvider>);
    expect(await screen.findByText(/vos choix ne modifient pas encore ce résultat/i)).toBeInTheDocument();
    expect(screen.getByText("Actuelle (exemple)")).toBeInTheDocument();
  });
});

describe("I-6 : le contrat accepte des données plus riches", () => {
  it("accepte un 15e terme de lexique", () => {
    const l = load("lexique");
    l.push({ ...l[0], terme: "Quinzième" });
    expect(LexiqueSchema.parse(l)).toHaveLength(15);
  });
  it("accepte une série GRACE plus longue et la dessine en entier", () => {
    const c = load("climat");
    c.grace.push({ annee: 2026, ecart: -1 });
    const climat = ClimatSchema.parse(c);
    const { container } = render(<GraceChart data={climat.grace} />);
    expect(container.querySelectorAll("[data-annee]")).toHaveLength(22);
  });
});

describe("données réelles : meta et affichage", () => {
  it("le contrat exige source et période quand meta est présente", () => {
    const c = load("climat");
    expect(() => ClimatSchema.parse({ ...c, meta: { reel: ["pluie"] } })).toThrow();
  });
  it("l'écran climat dit ce qui vient de la NASA et ce qui reste en exemple", async () => {
    localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: DEFAULT_PARCELLE, saisie: true }));
    const { default: ClimatPage } = await import("@/app/climat/page");
    render(<ParcelleProvider>{await ClimatPage()}</ParcelleProvider>);
    expect(await screen.findByText(/NASA POWER/, { selector: "p *, p" })).toBeInTheDocument();
    expect(screen.getByText(/autres indicateurs.*valeurs d'exemple/i)).toBeInTheDocument();
  });
});
