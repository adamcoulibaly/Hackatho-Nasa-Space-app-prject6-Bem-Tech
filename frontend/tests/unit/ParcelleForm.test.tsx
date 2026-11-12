import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParcelleProvider } from "@/lib/parcelle/context";
import { ParcelleForm } from "@/components/ParcelleForm";

const setup = () => {
  const onSubmit = vi.fn();
  render(<ParcelleProvider><ParcelleForm onSubmit={onSubmit} /></ParcelleProvider>);
  return { onSubmit, user: userEvent.setup() };
};

describe("ParcelleForm", () => {
  beforeEach(() => localStorage.clear());

  it("bloque l'envoi sans culture", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Maïs" }));
    await user.click(screen.getByRole("button", { name: "Coton" }));
    await user.click(screen.getByRole("button", { name: "Analyser ma parcelle" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Choisissez au moins une culture.");
  });

  it("bloque l'envoi avec une surface de 0", async () => {
    const { onSubmit, user } = setup();
    const surface = screen.getByLabelText("Surface (ha)");
    await user.clear(surface);
    await user.type(surface, "0");
    await user.click(screen.getByRole("button", { name: "Analyser ma parcelle" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("La surface doit être supérieure à 0.");
  });

  it("bloque l'envoi avec une surface vide", async () => {
    const { onSubmit, user } = setup();
    await user.clear(screen.getByLabelText("Surface (ha)"));
    await user.click(screen.getByRole("button", { name: "Analyser ma parcelle" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envoie une parcelle valide", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Analyser ma parcelle" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("ParcelleForm : catégorie « Autre »", () => {
  beforeEach(() => localStorage.clear());

  it("une autre culture se saisit, compte dans les 3 cultures, et est gardée", async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole("button", { name: "Autre culture" }));
    await user.type(screen.getByLabelText("Quelle autre culture ?"), "Anacarde");
    await user.click(screen.getByRole("button", { name: "Arachide" }));
    expect(screen.getByText(/3 cultures au plus/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Analyser ma parcelle" }));
    expect(onSubmit).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("forosat.parcelle")!).parcelle.autreCulture).toBe("Anacarde");
  });

  it("« Autre culture » cochée sans nom : l'envoi est bloqué", async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole("button", { name: "Autre culture" }));
    await user.click(screen.getByRole("button", { name: "Analyser ma parcelle" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Précisez l'autre culture.");
  });

  it("un autre objectif se saisit et est gardé", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("checkbox", { name: "Autre objectif" }));
    await user.type(screen.getByLabelText("Quel autre objectif ?"), "Planter des arbres");
    await user.click(screen.getByRole("button", { name: "Analyser ma parcelle" }));
    expect(JSON.parse(localStorage.getItem("forosat.parcelle")!).parcelle.autreObjectif).toBe("Planter des arbres");
  });
});

describe("moteur : culture sans fiche", () => {
  it("la rotation signale la culture non évaluée dans ses lacunes", async () => {
    const { getClimatRegion, getCultures } = await import("@/lib/data");
    const { calculerRotations } = await import("@/lib/moteur/rotations");
    const { DEFAULT_PARCELLE } = await import("@/lib/parcelle/validate");
    const [climat, cultures] = await Promise.all([getClimatRegion("poro"), getCultures()]);
    const r = calculerRotations({ ...DEFAULT_PARCELLE, autreCulture: "Anacarde" }, climat, cultures)!;
    expect(r[0].lacune).toContain("culture « Anacarde » non évaluée (pas encore de fiche culture)");
  });
});
