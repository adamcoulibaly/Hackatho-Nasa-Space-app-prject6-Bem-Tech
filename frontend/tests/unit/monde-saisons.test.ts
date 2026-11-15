// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { moisSemisFrais, saisonsLieu, serieDepuisPower, verdictSaison } from "@/lib/monde/saisons";
import { REGIONS } from "@/lib/regions";

const DATA = path.resolve(__dirname, "../../..");
const lire = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
const CULTURES = lire("knowledge/cultures.json").slice(0, 8); // les 8 cultures des fichiers ivoiriens
const ANNEES = Array.from({ length: 21 }, (_, i) => 2005 + i);

describe("saisons rejouées d'un point du monde : portage fidèle du pipeline Python", () => {
  it.each(["poro", "abidjan", "tonkpi"])("%s : mêmes verdicts que le fichier pré-calculé", (id) => {
    const r = REGIONS.find((x) => x.id === id)!;
    const attendu = lire(`data/saisons/${id}.json`);
    const s = serieDepuisPower(lire(`data/raw/jours/${id}.json`));
    const calcule = saisonsLieu(s, r.lat, id, attendu.meta.saison, CULTURES, ANNEES);
    expect(calcule).toEqual(attendu);
  });

  it("culture de saison fraîche : semée quand la chaleur retombe, ou trop chaud toute l'année", () => {
    // Chaleur maximale en mai (40 °C), sous 27 °C à partir de novembre.
    const tmax = [26, 30, 35, 38, 40, 36, 33, 31, 30, 28, 26, 25];
    expect(moisSemisFrais(tmax, 27)).toBe(11);
    expect(moisSemisFrais(tmax.map((t) => t + 10), 27)).toBeNull();
    const s = serieDepuisPower(lire("data/raw/jours/abidjan.json"));
    const ble = { nom: "Blé", cycleJours: 120, stades: { jours: [20, 25, 50, 25] as [number, number, number, number], kc: [0.4, 1.15, 0.3] as [number, number, number], source: "" }, semisFrais: 24 };
    expect(verdictSaison(s, 5.32, 2015, { debut: 5, fin: 7 }, ble)).toMatchObject({ verdict: "perdue", cause: "trop chaud toute l'année pour cette culture" });
  });
});
