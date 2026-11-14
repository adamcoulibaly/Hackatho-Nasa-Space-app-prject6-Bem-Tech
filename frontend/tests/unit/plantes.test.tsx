import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconeCulture, PlanteCulture, TEINTES_SAINES } from "@/components/plantes";
import { CULTURES } from "@/lib/parcelle/validate";
import { ParcelleProvider } from "@/lib/parcelle/context";
import { ParcelleForm } from "@/components/ParcelleForm";

describe("dessins des cultures", () => {
  it("chacune des 8 cultures a son propre dessin, à chaque stade", () => {
    for (const stade of ["levee", "floraison", "maturite"] as const) {
      const dessins = CULTURES.map((c) => renderToStaticMarkup(<svg><PlanteCulture culture={c} stade={stade} t={TEINTES_SAINES} /></svg>));
      expect(new Set(dessins).size).toBe(CULTURES.length);
    }
  });

  it("une culture inconnue (« Autre culture ») a un dessin générique, sans erreur", () => {
    expect(renderToStaticMarkup(<svg><PlanteCulture culture="anacarde" stade="maturite" t={TEINTES_SAINES} /></svg>)).toContain("<ellipse");
  });

  it("les icônes sont décoratives : le choix des cultures garde ses noms", () => {
    render(<ParcelleProvider><ParcelleForm onSubmit={() => undefined} /></ParcelleProvider>);
    for (const c of CULTURES) expect(screen.getByRole("button", { name: c })).toBeInTheDocument();
    expect(renderToStaticMarkup(<IconeCulture culture="Maïs" />)).toContain('aria-hidden="true"');
  });
});
