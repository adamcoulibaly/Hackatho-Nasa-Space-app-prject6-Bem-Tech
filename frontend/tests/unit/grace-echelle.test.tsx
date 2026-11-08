import { render } from "@testing-library/react";
import { GraceChart } from "@/components/GraceChart";
import { graceBar } from "@/lib/format";

describe("GRACE : l'échelle s'adapte aux vraies valeurs", () => {
  it("graceBar accepte une échelle en pixels par cm", () => {
    expect(graceBar({ annee: 2012, ecart: 10 }, 5)).toEqual({ up: 50, down: 0, gap: false });
  });
  it("aucune barre ne dépasse la demi-hauteur du graphique (70 px)", () => {
    const data = [{ annee: 2011, ecart: 14.4 }, { annee: 2016, ecart: -7.1 }, { annee: 2017, ecart: null }];
    const { container } = render(<GraceChart data={data} />);
    const hauteurs = [...container.querySelectorAll(".bar-grow, .bar-grow-down")].map((b) => parseFloat((b as HTMLElement).style.height));
    expect(Math.max(...hauteurs)).toBeLessThanOrEqual(70);
    expect(Math.max(...hauteurs)).toBeGreaterThan(60); // la plus grande valeur occupe presque toute la demi-hauteur
  });
});
