import { render, screen } from "@testing-library/react";
import { SiteHeader } from "@/components/SiteHeader";

describe("SiteHeader", () => {
  it("marque l'étape courante et affiche le badge", () => {
    render(<SiteHeader current="climat" badge="Korhogo · 2 ha" />);
    expect(screen.getByRole("link", { name: "2 · Climat" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "1 · Parcelle" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Korhogo · 2 ha")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /forosat/i })).toHaveAttribute("href", "/");
  });
});
