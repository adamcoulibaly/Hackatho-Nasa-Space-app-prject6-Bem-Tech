import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.resolve(__dirname, "../../src/app/globals.css"), "utf8");

describe("motion : règles du projet", () => {
  it("n'utilise que les durées 100, 150, 200 ou 300 ms", () => {
    const durees = [...css.matchAll(/(\d+)ms/g)].map((m) => Number(m[1]));
    expect(durees.length).toBeGreaterThan(0);
    for (const d of durees) expect([0, 20, 100, 150, 200, 300]).toContain(d); // 0 et 20 ms : délais, pas des durées
  });
  it("les @keyframes n'animent que transform et opacity", () => {
    const blocs = [...css.matchAll(/@keyframes[^{]+\{((?:[^{}]|\{[^{}]*\})*)\}/g)].map((m) => m[1]);
    expect(blocs.length).toBeGreaterThanOrEqual(3);
    for (const b of blocs) {
      const props = [...b.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      for (const p of props) expect(["opacity", "transform"]).toContain(p);
    }
  });
  it("prévoit prefers-reduced-motion sans translation ni échelle", () => {
    const bloc = css.slice(css.indexOf("prefers-reduced-motion: reduce"));
    expect(bloc).toContain("animation");
    expect(bloc).not.toMatch(/translate|scale/);
  });
  it("n'a aucune animation infinie", () => {
    expect(css).not.toMatch(/infinite/);
  });
});
