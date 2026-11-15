// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { climatComplet, mannKendall, rond, saisonsDesPluies, type BrutPower } from "@/lib/monde/climat";
import { REGIONS } from "@/lib/regions";

const DATA = path.resolve(__dirname, "../../../data");
const lire = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

/** Ce que le pipeline ajoute en plus de NASA POWER (végétation, eau stockée, pluie satellite, ECOSTRESS, état du jour). */
function seulementPower(c: Record<string, unknown>) {
  const x = structuredClone(c) as Record<string, any>;
  delete x.actuel; delete x.grace; delete x.imerg; delete x.ecostress;
  x.indicateurs = x.indicateurs.filter((i: { label: string }) => i.label !== "Végétation au plus bas");
  x.matrice = x.matrice.filter((m: { label: string }) => m.label !== "Végétation");
  x.onglets = x.onglets.filter((o: { id: string }) => o.id !== "veg");
  x.meta.reel = x.meta.reel.filter((r: string) => ["pluie", "chaleur", "humidité du sol"].includes(r));
  return x;
}

describe("climat d'un point du monde : portage fidèle du pipeline Python", () => {
  it("arrondi de Python et petites fonctions", () => {
    expect(rond(2.5)).toBe(2);
    expect(rond(3.5)).toBe(4);
    expect(rond(0.125, 2)).toBe(0.12);
    expect(saisonsDesPluies([0, 0, 50, 100, 120, 60, 10, 0, 0, 80, 90, 0]).length).toBeGreaterThanOrEqual(1);
    expect(mannKendall([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).tendance).toBe("hausse");
  });

  it.each(["poro", "abidjan", "tonkpi", "bounkani", "san-pedro"])("%s : même climat que le fichier pré-calculé", (id) => {
    const r = REGIONS.find((x) => x.id === id)!;
    const brut = lire(`raw/power/${id}.json`) as BrutPower;
    const calcule = climatComplet(brut, null, r, new Date("2026-11-15T00:00:00Z"));
    expect(seulementPower(calcule)).toEqual(seulementPower(lire(`regions/${id}.json`)));
  });
});
