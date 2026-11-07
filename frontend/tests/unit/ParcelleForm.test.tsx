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
