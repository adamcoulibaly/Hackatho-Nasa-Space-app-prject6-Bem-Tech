import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import ConseillerPage from "@/app/conseiller/page";

const RACINE = path.resolve(__dirname, "../../../");
function fichiers(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiers(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

describe("plus aucune donnée de démonstration", () => {
  it("aucun texte d'exemple dans le code de l'interface ni dans les données régionales", () => {
    const interdits = [/valeurs d'exemple/i, /\[exemple\]/i, /exemple Korhogo/i, /exemples de Korhogo/i];
    const fautifs = [...fichiers(path.join(RACINE, "frontend/src")), ...fichiers(path.join(RACINE, "data/regions"))]
      .filter((f) => /\.(tsx?|json)$/.test(f))
      .filter((f) => interdits.some((r) => r.test(fs.readFileSync(f, "utf8"))));
    expect(fautifs.map((f) => path.relative(RACINE, f))).toEqual([]);
  });
  it("l'espace conseiller ne montre aucun faux agriculteur", () => {
    render(<ConseillerPage />);
    expect(screen.getByText("Aucun agriculteur suivi pour l'instant")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
