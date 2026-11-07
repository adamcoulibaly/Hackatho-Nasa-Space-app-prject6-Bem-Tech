import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { lienFiche, lireLienFiche } from "@/lib/moteur/fiche-lien";
import { DEFAULT_PARCELLE, type Parcelle } from "@/lib/parcelle/validate";
import { ParcelleProvider } from "@/lib/parcelle/context";
import { RotationsVue } from "@/components/RotationsVue";
import { FicheVue } from "@/components/FicheVue";
import { lireClimat, CULTURES_FICHES, rotations } from "../helpers/moteur";

const korhogo = lireClimat("poro");
const sauver = (p: Partial<Parcelle>) => localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: { ...DEFAULT_PARCELLE, ...p }, saisie: true }));

describe("lien de fiche reproductible", () => {
  const p: Parcelle = { ...DEFAULT_PARCELLE, region: "gbeke", cultures: ["Igname", "Maïs"], priorites: ["Utiliser moins d'eau"], eau: "irrigation", materiel: "daba", contour: [[1, 2], [3, 4], [5, 6]] };
  it("encode puis relit la parcelle (sans le contour)", () => {
    const l = lienFiche("B", p);
    expect(l.startsWith("/fiche/B?")).toBe(true);
    const { contour, centre, ...attendu } = p;
    expect(lireLienFiche(new URLSearchParams(l.split("?")[1]))).toEqual(attendu);
  });
  it("un lien incomplet ou invalide donne null", () => {
    expect(lireLienFiche(new URLSearchParams("c=Maïs&p=0&e=pluie&m=daba"))).toBeNull();
    expect(lireLienFiche(new URLSearchParams("r=atlantide&c=Maïs&p=0&e=pluie&m=daba"))).toBeNull();
    expect(lireLienFiche(new URLSearchParams("r=poro&c=Tomate&p=0&e=pluie&m=daba"))).toBeNull();
  });
});

describe("RotationsVue", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("affiche les 3 rotations calculées, dont l'actuelle saisie", async () => {
    sauver({ cultures: ["Maïs", "Coton"] });
    render(<ParcelleProvider><RotationsVue initial={korhogo} cultures={CULTURES_FICHES} /></ParcelleProvider>);
    expect(await screen.findByText("Actuelle")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    const attendues = rotations({ cultures: ["Maïs", "Coton"] });
    expect(screen.getByRole("link", { name: "Voir le détail de la rotation B" })).toBeInTheDocument();
    expect(screen.getAllByText(attendues[1].sequence[0]).length).toBeGreaterThan(0);
  });

  it("si le climat de la région ne se charge pas, propose de recharger", async () => {
    sauver({ region: "gbeke" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    render(<ParcelleProvider><RotationsVue initial={korhogo} cultures={CULTURES_FICHES} /></ParcelleProvider>);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Impossible de charger le climat/);
  });
});

describe("FicheVue", () => {
  afterEach(() => localStorage.clear());
  it("un lien incomplet affiche « Lien incomplet » et un retour à l'accueil", async () => {
    render(<ParcelleProvider><FicheVue id="B" initial={korhogo} cultures={CULTURES_FICHES} params={new URLSearchParams("r=poro")} /></ParcelleProvider>);
    expect(await screen.findByText("Lien incomplet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /accueil/i })).toHaveAttribute("href", "/");
  });
  it("un lien complet affiche la fiche de la rotation demandée, même sans parcelle enregistrée", async () => {
    const p = { ...DEFAULT_PARCELLE, cultures: ["Sorgho"] };
    const l = lienFiche("A", p);
    render(<ParcelleProvider><FicheVue id="A" initial={korhogo} cultures={CULTURES_FICHES} params={new URLSearchParams(l.split("?")[1])} /></ParcelleProvider>);
    expect(await screen.findByText(/Rotation A · Sorgho/)).toBeInTheDocument();
  });
});
