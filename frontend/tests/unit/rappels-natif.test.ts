import { lireListeRappels, prochainRappel, quand } from "../../../mobile/lib/rappelsListe";

const ok = { id: "semis", date: "2026-05-28", titre: "Maïs : période de semis", texte: "Semez après une bonne pluie.", chemin: "/calendrier", onglet: "tableau" as const };

describe("rappels côté téléphone", () => {
  it("n'accepte que des rappels valides venus de la page (au plus 20)", () => {
    expect(lireListeRappels([ok])).toEqual([ok]);
    expect(lireListeRappels([{ ...ok, chemin: "https://ailleurs.com" }, { ...ok, onglet: "x" }, { ...ok, date: "demain" }, { ...ok, id: "../x" }])).toEqual([]);
    expect(lireListeRappels(Array(30).fill(ok))).toHaveLength(20);
    expect(lireListeRappels("pas une liste")).toEqual([]);
  });
  it("chaque rappel sonne à 8 h, heure du téléphone ; le prochain est le premier à venir", () => {
    const d = quand("2026-05-28");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 4, 28, 8]);
    expect(prochainRappel([ok, { ...ok, id: "preparation", date: "2026-05-07" }], new Date(2026, 4, 1))).toBe("2026-05-07");
    expect(prochainRappel([ok], new Date(2026, 5, 1))).toBeUndefined();
  });
});
