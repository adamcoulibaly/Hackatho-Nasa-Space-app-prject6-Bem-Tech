import { render, screen } from "@testing-library/react";
import { SiteHeader } from "@/components/SiteHeader";

describe("SiteHeader", () => {
  it("marque l'étape courante et affiche le badge", () => {
    render(<SiteHeader current="climat" badge="Korhogo · 2 ha" />);
    expect(screen.getByRole("link", { name: "Climat" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Parcelle" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Korhogo · 2 ha")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /forosat/i })).toHaveAttribute("href", "/");
  });

  it("n'affiche aucun numéro dans la navigation", () => {
    render(<SiteHeader current="parcelle" />);
    const nav = screen.getByRole("navigation", { name: "Étapes" });
    expect(nav.textContent).not.toMatch(/\d/);
  });
});
