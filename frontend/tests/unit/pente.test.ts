// @vitest-environment node
import { PNG } from "pngjs";
import {
  altitudeTerrarium, classePente, cleContour, conseilPente, dansPolygone, meilleureAntiErosion, metresParPixel,
  penteParcelle, pixelGlobal, tuilesDuContour, type PointLatLon,
} from "@/lib/pente";
import { POST } from "@/app/api/pente/route";

// Un champ d'environ 2 ha près de Korhogo.
const CHAMP: PointLatLon[] = [[9.4600, -5.6300], [9.4600, -5.6285], [9.4588, -5.6285], [9.4588, -5.6300]];

describe("pente : calcul", () => {
  it("décode l'altitude terrarium", () => {
    expect(altitudeTerrarium(128, 0, 0)).toBe(0);
    expect(altitudeTerrarium(129, 44, 128)).toBeCloseTo(300.5, 5);
  });

  it("trouve une pente connue sur un plan incliné (5 % vers l'est)", () => {
    const m = metresParPixel(9.459, 13);
    const p = penteParcelle(CHAMP, (gx) => 300 + gx * m * 0.05)!;
    expect(p.moyenne).toBeCloseTo(5, 1);
    expect(p.forte).toBeCloseTo(5, 1);
    expect(p.classe).toBe("fort");
    expect(p.points).toBeGreaterThan(0);
  });

  it("terrain plat : 0 % et classe faible ; altitude manquante : pas de résultat", () => {
    expect(penteParcelle(CHAMP, () => 250)).toMatchObject({ moyenne: 0, classe: "faible", altitudeMin: 250, altitudeMax: 250 });
    expect(penteParcelle(CHAMP, () => null)).toBeNull();
    expect(penteParcelle(CHAMP.slice(0, 2), () => 1)).toBeNull();
  });

  it("classes de pente et conseils", () => {
    expect([1.9, 2, 4.9, 5, 9.9, 10].map(classePente)).toEqual(["faible", "modere", "modere", "fort", "fort", "tres-fort"]);
    expect(conseilPente({ moyenne: 7, forte: 9, altitudeMin: 0, altitudeMax: 1, classe: "fort", points: 1 })).toMatch(/courbes de niveau/);
  });

  it("point dans le polygone, tuiles à lire, clé de contour", () => {
    const carre = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(dansPolygone(5, 5, carre)).toBe(true);
    expect(dansPolygone(15, 5, carre)).toBe(false);
    const { gx, gy } = pixelGlobal(9.46, -5.63, 13);
    expect(tuilesDuContour(CHAMP)).toContainEqual({ x: Math.floor(gx / 256), y: Math.floor(gy / 256) });
    expect(cleContour(CHAMP)).toBe(cleContour(CHAMP.map((p) => [...p] as PointLatLon)));
    expect(cleContour(CHAMP)).not.toBe(cleContour([...CHAMP.slice(1), CHAMP[0]]));
  });

  it("la meilleure rotation anti-érosion, la recommandée d'abord à égalité", () => {
    const r = (id: string, erosion: number, recommandee = false) => ({ id, recommandee, scores: { erosion } });
    expect(meilleureAntiErosion([r("A", 2), r("B", 4), r("C", 3)]).id).toBe("B");
    expect(meilleureAntiErosion([r("A", 4), r("B", 4, true), r("C", 1)]).id).toBe("B");
  });
});

describe("POST /api/pente", () => {
  afterEach(() => vi.unstubAllGlobals());
  const requete = (corps: unknown) => new Request("http://localhost/api/pente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });

  it("lit les tuiles d'altitude et renvoie la pente, avec sa source", async () => {
    // Tuile terrarium : altitude qui monte de 1 m par pixel vers l'est (≈ 5 % à ce zoom).
    const png = new PNG({ width: 256, height: 256 });
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const alt = 300 + x + 32768, i = (y * 256 + x) * 4;
      png.data[i] = Math.floor(alt / 256); png.data[i + 1] = Math.floor(alt % 256); png.data[i + 2] = 0; png.data[i + 3] = 255;
    }
    const tuile = PNG.sync.write(png);
    const f = vi.fn(async (_url: string) => new Response(new Uint8Array(tuile), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const r = await POST(requete({ contour: CHAMP }));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.moyenne).toBeCloseTo(100 / metresParPixel(9.459, 13), 0);
    expect(j.source).toMatch(/SRTM/);
    expect(String(f.mock.calls[0][0])).toMatch(/elevation-tiles-prod\/terrarium\/13\//);
  });

  it("refuse un contour invalide ou une zone trop grande", async () => {
    expect((await POST(requete({ contour: [[1, 2]] }))).status).toBe(400);
    expect((await POST(requete({ contour: [[9, -5], [9, "x"], [8, -5]] }))).status).toBe(400);
    expect((await POST(requete({ contour: [[9, -6], [9, -5], [8, -5]] }))).status).toBe(413);
  });
});
