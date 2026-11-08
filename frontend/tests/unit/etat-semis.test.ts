import { etatSemis } from "@/lib/moteur/etat-semis";
import { etatSemisRegion } from "@/lib/semis";

const SAISON = { debut: 5, fin: 10 };

/** 30 jours se terminant le `fin` (AAAA-MM-JJ), avec la pluie donnée (complétée par des 0 au début). */
function jours(fin: string, pluies: (number | null)[]) {
  const d = new Date(`${fin}T00:00:00Z`);
  const p = [...Array(Math.max(0, 30 - pluies.length)).fill(0), ...pluies];
  return p.map((pluie, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() - (p.length - 1 - i));
    return { date: x.toISOString().slice(0, 10), pluie };
  });
}

describe("etatSemis", () => {
  it("saison sèche : rien n'est tombé, les pluies sont attendues au mois de début de saison", () => {
    const e = etatSemis(jours("2026-03-20", []), SAISON);
    expect(e.etat).toBe("seche");
    expect(e.message).toContain("mai");
  });

  it("premières pluies : il a plu, mais pas assez pour semer", () => {
    expect(etatSemis(jours("2026-05-20", [0, 5, 0, 0, 3, 0, 0, 0]), SAISON).etat).toBe("premieres_pluies");
  });

  it("fenêtre ouverte : au moins 20 mm en 3 jours, sans poche sèche depuis", () => {
    const e = etatSemis(jours("2026-06-10", [12, 10, 4, 2, 0, 3, 6, 1, 0, 2]), SAISON);
    expect(e.etat).toBe("fenetre_ouverte");
    expect(e.depuis).toBe("2026-06-02");
  });

  it("poche sèche : 7 jours secs après l'ouverture", () => {
    const e = etatSemis(jours("2026-06-10", [15, 10, 0, 0, 0, 0, 0, 0, 0, 0.5]), SAISON);
    expect(e.etat).toBe("poche_seche");
    expect(e.depuis).toBe("2026-06-03");
  });

  it("hors saison (après la fin), même un orage ne rouvre pas la fenêtre", () => {
    expect(etatSemis(jours("2026-12-15", [30, 0, 0]), SAISON).etat).toBe("seche");
  });

  it("une région à deux saisons suit sa saison principale (mars → juillet)", () => {
    const e = etatSemis(jours("2026-01-20", []), { debut: 3, fin: 7 });
    expect(e.message).toContain("mars");
  });

  it("les jours sans mesure sont ignorés", () => {
    const e = etatSemis(jours("2026-06-10", [12, null, 10, 4, 2, 0, 3, 6, 1, 0, 2]), SAISON);
    expect(e.etat).toBe("fenetre_ouverte");
  });
});

describe("etatSemisRegion", () => {
  const climat = { saisonPluies: SAISON };

  it("lit NASA POWER (pluie journalière) et donne l'état et la date des données", async () => {
    const valeurs = Object.fromEntries(jours("2026-06-10", [12, 10, 4, 2, 0, 3, 6, 1, 0, 2]).map((j) => [j.date.replaceAll("-", ""), j.pluie]));
    valeurs["20260611"] = -999; // pas encore publié
    const f = vi.fn(async (_url: string) => new Response(JSON.stringify({ properties: { parameter: { PRECTOTCORR: valeurs } } })));
    const r = await etatSemisRegion("poro", { fetch: f as typeof fetch, aujourdhui: new Date("2026-06-12T08:00:00Z"), climat });
    expect(r.statut).toBe(200);
    expect(r.corps).toMatchObject({ etat: "fenetre_ouverte", dateDonnees: "2026-06-10" });
    expect(String(f.mock.calls[0][0])).toContain("PRECTOTCORR");
  });

  it("NASA POWER en panne : 503 et message clair", async () => {
    const f = vi.fn(async () => new Response("down", { status: 500 }));
    const r = await etatSemisRegion("poro", { fetch: f as typeof fetch, aujourdhui: new Date(), climat });
    expect(r).toEqual({ statut: 503, corps: { erreur: "Données NASA POWER indisponibles pour le moment." } });
  });

  it("région inconnue : 404", async () => {
    const r = await etatSemisRegion("atlantide", { fetch: vi.fn() as typeof fetch, aujourdhui: new Date(), climat });
    expect(r.statut).toBe(404);
  });
});

describe("Tableau : état de semis en direct", () => {
  it("affiche l'état NASA POWER du jour à la place du libellé de saison", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { createElement } = await import("react");
    const { Tableau } = await import("@/components/Tableau");
    const { getClimatRegion, getCultures } = await import("@/lib/data");
    const { calculerRotations } = await import("@/lib/moteur/rotations");
    const { DEFAULT_PARCELLE } = await import("@/lib/parcelle/validate");
    const [climat, cultures] = await Promise.all([getClimatRegion("poro"), getCultures()]);
    const reco = calculerRotations(DEFAULT_PARCELLE, climat, cultures)![1];
    const semis = { etat: "fenetre_ouverte" as const, depuis: "2026-06-02", message: "Pluies installées depuis le 2 juin : c'est le moment de semer.", dateDonnees: "2026-06-10" };
    render(createElement(Tableau, { climat, reco, semis }));
    expect(screen.getByText("Fenêtre de semis ouverte")).toBeInTheDocument();
    expect(screen.getByText(/Pluies installées depuis le 2 juin/)).toBeInTheDocument();
    expect(screen.getByText(/NASA POWER, pluie jusqu'au 10 juin/)).toBeInTheDocument();
  });
});
