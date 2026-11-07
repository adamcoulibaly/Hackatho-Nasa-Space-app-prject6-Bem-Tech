import { scoreWord, scoreSegments, barHeight, graceBar } from "@/lib/format";

describe("format", () => {
  it("scoreWord", () => {
    expect([1, 2, 3, 4, 5].map(scoreWord)).toEqual(["Faible", "Faible", "Moyen", "Bon", "Très bon"]);
  });
  it("scoreSegments : 4 segments verts puis un vide", () => {
    expect(scoreSegments(4, false)).toEqual(["#00703C", "#00703C", "#00703C", "#00703C", "#DDE3DC"]);
  });
  it("scoreSegments : niveau 3 en orange, fond sombre", () => {
    expect(scoreSegments(3, true)).toEqual(["#F77F00", "#F77F00", "#F77F00", "#1F3328", "#1F3328"]);
  });
  it("barHeight : minimum 4, maximum px", () => {
    expect(barHeight(5, 260, 170)).toBe(4);
    expect(barHeight(260, 260, 170)).toBe(170);
  });
  it("graceBar : une mesure absente est une lacune, pas un zéro", () => {
    expect(graceBar({ annee: 2017, ecart: null })).toEqual({ up: 0, down: 0, gap: true });
    expect(graceBar({ annee: 2005, ecart: 3 })).toEqual({ up: 36, down: 0, gap: false });
    expect(graceBar({ annee: 2025, ecart: -5 })).toEqual({ up: 0, down: 60, gap: false });
  });
});
