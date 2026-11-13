import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Saisons, VerdictSaison } from "@/lib/contract";
import { ajouterObservation, comparerObservation, lireCarnet, supprimerObservation } from "@/lib/carnet";
import { ParcelleProvider } from "@/lib/parcelle/context";
import { CarnetSuivi } from "@/components/CarnetSuivi";
import { ongletDe } from "@/lib/modeApp";

const v = (annee: number, verdict: VerdictSaison["verdict"]): VerdictSaison => ({ annee, verdict, semis: null, ratio: null, cause: "" });
const saisons: Saisons = {
  meta: { region: "poro", source: "", periode: "", saison: { debut: 5, fin: 10 }, reserveMm: 100 },
  cultures: { Maïs: [...Array(18)].map((_, i) => v(2005 + i, "bonne")).concat([v(2023, "perdue"), v(2024, "difficile")]) },
};
const obs = { date: "2026-08-10", culture: "Maïs", etat: "mauvaise" as const, pluie: "pas_assez" as const, note: "Feuilles enroulées" };

describe("carnet (stockage sur le téléphone)", () => {
  beforeEach(() => localStorage.clear());

  it("ajoute, relit (plus récente d'abord) et supprime des observations", () => {
    ajouterObservation(obs);
    ajouterObservation({ ...obs, date: "2026-09-01", etat: "bonne", note: "" });
    const c = lireCarnet();
    expect(c.map((o) => o.date)).toEqual(["2026-09-01", "2026-08-10"]);
    supprimerObservation(c[0].id);
    expect(lireCarnet()).toHaveLength(1);
  });

  it("refuse une observation invalide et ignore un stockage corrompu", () => {
    expect(() => ajouterObservation({ ...obs, note: "x".repeat(400) })).toThrow();
    localStorage.setItem("forosat.carnet", "{corrompu");
    expect(lireCarnet()).toEqual([]);
  });

  it("compare l'observation à ce que les saisons réelles laissaient prévoir", () => {
    const c = comparerObservation(obs, saisons);
    expect(c.attendu).toBe("En général (2005–2025), cette culture a plutôt de bonnes saisons ici : 18 sur 20.");
    expect(c.ecart).toBe(true);
    expect(comparerObservation({ ...obs, etat: "bonne" }, saisons).ecart).toBe(false);
    expect(comparerObservation({ ...obs, culture: "Anacarde" }, saisons).attendu).toMatch(/pas de prévision/i);
  });
});

describe("CarnetSuivi", () => {
  beforeEach(() => localStorage.clear());

  it("le formulaire ajoute une observation qui apparaît avec la comparaison", async () => {
    const u = userEvent.setup();
    render(<ParcelleProvider><CarnetSuivi saisons={saisons} /></ParcelleProvider>);
    await u.click(screen.getByRole("radio", { name: "Mauvais" }));
    await u.click(screen.getByRole("radio", { name: "Pas assez de pluie" }));
    await u.type(screen.getByLabelText("Ce que j'observe (facultatif)"), "Feuilles enroulées");
    await u.click(screen.getByRole("button", { name: "Ajouter au carnet" }));
    const item = screen.getAllByRole("listitem")[0];
    expect(within(item).getByText(/Feuilles enroulées/)).toBeInTheDocument();
    expect(within(item).getByText(/Écart avec la prévision/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("forosat.carnet")!)).toHaveLength(1);
  });

  it("dans l'app, le carnet s'ouvre dans l'onglet Champ", () => {
    expect(ongletDe("/suivi")).toBe("champ");
  });
});

describe("carnet : prévisions face à la réalité", () => {
  beforeEach(() => localStorage.clear());

  it("la prévision est figée au moment de l'observation", () => {
    const o = ajouterObservation(obs, saisons);
    expect(o.prevision).toMatchObject({ part: 0.9 });
    // Même si les données changent ensuite, la comparaison garde la prévision d'origine.
    const autres: Saisons = { ...saisons, cultures: { Maïs: saisons.cultures["Maïs"].map((x) => ({ ...x, verdict: "perdue" as const })) } };
    expect(comparerObservation(lireCarnet()[0], autres).attendu).toMatch(/18 sur 20/);
  });

  it("une récolte réelle se compare à l'habitude", () => {
    expect(comparerObservation({ ...obs, type: "recolte", recolte: "faible" }, saisons).ecart).toBe(true);
    expect(comparerObservation({ ...obs, type: "recolte", recolte: "bonne", etat: "bonne" }, saisons).ecart).toBe(false);
  });

  it("bilan : combien d'observations ont confirmé l'habitude ForoSat", async () => {
    const { bilanCarnet } = await import("@/lib/carnet");
    ajouterObservation(obs, saisons);
    ajouterObservation({ ...obs, date: "2026-09-01", etat: "bonne" }, saisons);
    ajouterObservation({ ...obs, date: "2026-10-01", etat: "bonne" }, saisons);
    expect(bilanCarnet(lireCarnet(), saisons)).toEqual({ total: 3, concordent: 2 });
  });
});

describe("CarnetSuivi : pictogrammes et récolte", () => {
  beforeEach(() => localStorage.clear());
  it("chaque choix d'état et de pluie porte un pictogramme ; on peut noter une récolte", async () => {
    const u = userEvent.setup();
    const { container } = render(<ParcelleProvider><CarnetSuivi saisons={saisons} /></ParcelleProvider>);
    expect(container.querySelectorAll("[data-picto]").length).toBeGreaterThanOrEqual(6);
    await u.click(screen.getByRole("radio", { name: "Récolte" }));
    await u.click(screen.getByRole("radio", { name: "Faible" }));
    await u.click(screen.getByRole("button", { name: "Ajouter au carnet" }));
    expect(screen.getByText(/Récolte faible/)).toBeInTheDocument();
    expect(screen.getByText(/sur 1 observation/)).toBeInTheDocument();
  });
});
