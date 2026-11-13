import type { Saisons, VerdictSaison } from "@/lib/contract";
import { getCultures, getClimatRegion } from "@/lib/data";
import { calendrierCulture, semisHabituel, etapeDuJour } from "@/lib/moteur/calendrier-agricole";

const v = (annee: number, semis: string | null): VerdictSaison => ({ annee, verdict: semis ? "bonne" : "perdue", semis, ratio: semis ? 0.9 : null, cause: "" });
const saisons: Saisons = {
  meta: { region: "poro", source: "", periode: "", saison: { debut: 5, fin: 10 }, reserveMm: 100 },
  cultures: { Maïs: [v(2018, "2018-05-20"), v(2019, "2019-06-02"), v(2020, "2020-05-28"), v(2021, null)] },
};

describe("semisHabituel", () => {
  it("date de semis médiane réellement observée (jour et mois), pas de semis exclus", () => {
    expect(semisHabituel(saisons, "Maïs", 2026)).toEqual({ date: "2026-05-28", source: "mesure" });
  });
  it("culture sans saison mesurée : 15 jours après le début de la saison, présenté comme estimation", () => {
    expect(semisHabituel(saisons, "Riz", 2026, { debut: 9, fin: 10 })).toEqual({ date: "2026-09-15", source: "estimation" });
  });
});

describe("calendrierCulture", () => {
  it("de la préparation du sol au post-récolte, dans l'ordre, calé sur la date de semis et le cycle de la culture", async () => {
    const mais = (await getCultures()).find((c) => c.nom === "Maïs")!;
    const etapes = calendrierCulture(mais, "2026-05-28");
    expect(etapes.map((e) => e.id)).toEqual(["preparation", "semis", "levee", "entretien", "floraison", "maturation", "recolte", "post_recolte"]);
    expect(etapes[0].debut).toBe("2026-05-07");
    expect(etapes[1]).toMatchObject({ debut: "2026-05-28", fin: "2026-06-03" });
    // Maïs : 110 jours → récolte à partir du 15 septembre.
    expect(etapes.find((e) => e.id === "recolte")!.debut).toBe("2026-09-15");
    for (let i = 1; i < etapes.length; i++) expect(etapes[i].debut >= etapes[i - 1].debut).toBe(true);
    for (const e of etapes) expect(e.conseil.length).toBeGreaterThan(15);
  });

  it("le sarclage et l'entretien tombent pendant la croissance", async () => {
    const mais = (await getCultures()).find((c) => c.nom === "Maïs")!;
    const e = calendrierCulture(mais, "2026-05-28").find((x) => x.id === "entretien")!;
    expect(e.conseil).toMatch(/sarcl/);
  });
});

describe("etapeDuJour", () => {
  it("l'étape en cours à une date, ou « avant » / « terminé »", async () => {
    const mais = (await getCultures()).find((c) => c.nom === "Maïs")!;
    const etapes = calendrierCulture(mais, "2026-05-28");
    expect(etapeDuJour(etapes, "2026-05-30")?.id).toBe("semis");
    expect(etapeDuJour(etapes, "2026-01-10")).toBeNull();
    expect(etapeDuJour(etapes, "2026-09-20")?.id).toBe("recolte");
  });
});

describe("saisons régionales", () => {
  it("une région du sud a deux saisons : le calendrier peut se caler sur la petite saison", async () => {
    const abidjan = await getClimatRegion("abidjan");
    expect(abidjan.saisons?.length).toBe(2);
    const niebe = (await getCultures()).find((c) => c.nom === "Niébé")!;
    const petite = abidjan.saisons![1];
    const s = semisHabituel(saisons, "Niébé", 2026, petite);
    const etapes = calendrierCulture(niebe, s.date);
    expect(etapes[1].debut.slice(5, 7)).toBe(String(petite.debut).padStart(2, "0"));
  });
});

describe("CalendrierAgricole (écran)", () => {
  it("affiche les 8 étapes datées, met en avant l'étape du jour, et suit la date réelle de semis", async () => {
    const { render, screen, fireEvent } = await import("@testing-library/react");
    const { createElement } = await import("react");
    const { CalendrierAgricole } = await import("@/components/CalendrierAgricole");
    const cultures = await getCultures();
    render(createElement(CalendrierAgricole, { cultures, mesCultures: ["Maïs", "Coton"], saisons, saisonsRegion: [{ debut: 5, fin: 10 }], aujourdhui: "2026-07-01" }));
    expect(screen.getAllByTestId(/^etape/)).toHaveLength(8);
    expect(screen.getByText(/semis habituel observé/i)).toBeInTheDocument();
    expect(screen.getByTestId("etape-en-cours").textContent).toMatch(/Croissance et entretien/);
    fireEvent.change(screen.getByLabelText("Date de semis"), { target: { value: "2026-06-10" } });
    expect(screen.getByText(/28 septembre/)).toBeInTheDocument(); // récolte : 10 juin + 110 jours
  });

  it("région à deux saisons : on peut choisir la petite saison", async () => {
    const { render, screen } = await import("@testing-library/react");
    const userEvent = (await import("@testing-library/user-event")).default;
    const { createElement } = await import("react");
    const { CalendrierAgricole } = await import("@/components/CalendrierAgricole");
    const cultures = await getCultures();
    render(createElement(CalendrierAgricole, { cultures, mesCultures: ["Niébé"], saisons, saisonsRegion: [{ debut: 3, fin: 6 }, { debut: 9, fin: 10 }], aujourdhui: "2026-07-01" }));
    await userEvent.setup().click(screen.getByRole("button", { name: /Petite saison/ }));
    expect((screen.getByLabelText("Date de semis") as HTMLInputElement).value).toBe("2026-09-15");
  });
});
