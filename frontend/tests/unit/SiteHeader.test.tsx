import { render, screen } from "@testing-library/react";
import { SiteHeader } from "@/components/SiteHeader";

describe("SiteHeader", () => {
  it("marque l'étape courante et affiche le badge", () => {
    render(<SiteHeader current="climat" badge="Korhogo · 2 ha" />);
    expect(screen.getByRole("link", { name: "Climat" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Parcelle" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Korhogo · 2 ha")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ForoSat — accueil" })).toHaveAttribute("href", "/");
  });

  it("n'affiche aucun numéro dans la navigation", () => {
    render(<SiteHeader current="parcelle" />);
    const nav = screen.getByRole("navigation", { name: "Étapes" });
    expect(nav.textContent).not.toMatch(/\d/);
  });
});

describe("SiteHeader : trois espaces", () => {
  it("le menu est rangé en Décider, Suivre ma saison et Comprendre ; l'espace de la page est mis en avant", () => {
    render(<SiteHeader current="rotations" />);
    const nav = screen.getByRole("navigation", { name: "Étapes" });
    expect([...nav.querySelectorAll("summary")].map((s) => s.textContent?.replace("⌄", "").trim())).toEqual(["Décider", "Suivre ma saison", "Comprendre"]);
    expect(nav.querySelector("summary.bg-paper")?.textContent).toMatch(/Décider/);
    expect(screen.getByRole("link", { name: "Rotations" })).toHaveAttribute("aria-current", "page");
  });
});
