import { alertesMeteo } from "@/lib/moteur/alertes";

const SAISON = [{ debut: 5, fin: 10 }];
function jours(fin: string, pluies: (number | null)[]) {
  const d = new Date(`${fin}T00:00:00Z`);
  const p = [...Array(Math.max(0, 30 - pluies.length)).fill(3), ...pluies];
  return p.map((pluie, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() - (p.length - 1 - i));
    return { date: x.toISOString().slice(0, 10), pluie };
  });
}

describe("alertesMeteo", () => {
  it("rien d'anormal : risque faible, aucune alerte", () => {
    expect(alertesMeteo(jours("2026-07-15", []), SAISON)).toEqual({ risque: "faible", alertes: [] });
  });

  it("fortes pluies : 60 mm en un jour → alerte moyenne avec conseil", () => {
    const r = alertesMeteo(jours("2026-07-15", [2, 60, 4]), SAISON);
    expect(r.risque).toBe("moyen");
    expect(r.alertes[0]).toMatchObject({ type: "fortes_pluies", niveau: "moyen", depuis: "2026-07-14" });
    expect(r.alertes[0].conseil).toMatch(/drainage|ruissellement|érosion/);
  });

  it("très fortes pluies : 160 mm en 3 jours → risque élevé", () => {
    expect(alertesMeteo(jours("2026-07-15", [60, 50, 50]), SAISON).risque).toBe("eleve");
  });

  it("sécheresse en saison : 10 jours secs → moyen, 15 jours → élevé", () => {
    expect(alertesMeteo(jours("2026-07-15", [12, ...Array(10).fill(0)]), SAISON).alertes[0]).toMatchObject({ type: "secheresse", niveau: "moyen" });
    const r = alertesMeteo(jours("2026-07-20", [12, ...Array(15).fill(0.2)]), SAISON);
    expect(r).toMatchObject({ risque: "eleve" });
    expect(r.alertes[0].conseil).toMatch(/paillage|semis|eau/);
  });

  it("début de saison après un mois sec normal : pas d'alerte sécheresse (la saison n'a pas encore commencé)", () => {
    const sec30 = (fin: string) => alertesMeteo(jours(fin, Array(30).fill(0)), SAISON);
    for (const fin of ["2026-05-10", "2026-05-11", "2026-05-12"]) expect(sec30(fin).alertes).toEqual([]);
  });

  it("la sécheresse se compte après la vraie première pluie de la saison, et son début reste stable", () => {
    const serie = (fin: string, secs: number) => jours(fin, [0, 0, 15, ...Array(secs).fill(0)]);
    const a = alertesMeteo(serie("2026-06-20", 12), SAISON).alertes[0];
    const b = alertesMeteo(serie("2026-06-21", 13), SAISON).alertes[0];
    expect(a).toMatchObject({ type: "secheresse", depuis: "2026-06-09" });
    expect(b.depuis).toBe(a.depuis);
  });

  it("hors saison, des jours secs ne sont pas une alerte sécheresse", () => {
    expect(alertesMeteo(jours("2026-01-20", Array(25).fill(0)), SAISON).alertes).toEqual([]);
  });

  it("les jours sans mesure ne comptent ni comme secs ni comme pluvieux", () => {
    expect(alertesMeteo(jours("2026-07-15", [0, 0, 0, 0, 0, null, null, null, 0, 0]), SAISON).alertes).toEqual([]);
  });
});

describe("intégration des alertes", () => {
  it("/api/semis renvoie aussi l'indice de risque et les alertes", async () => {
    const { etatSemisRegion } = await import("@/lib/semis");
    const valeurs = Object.fromEntries(jours("2026-07-15", [2, 60, 4]).map((j) => [j.date.replaceAll("-", ""), j.pluie]));
    const f = vi.fn(async (_u: string) => new Response(JSON.stringify({ properties: { parameter: { PRECTOTCORR: valeurs } } })));
    const r = await etatSemisRegion("poro", { fetch: f as typeof fetch, aujourdhui: new Date("2026-07-16T08:00:00Z"), climat: { saisonPluies: { debut: 5, fin: 10 } } });
    expect(r.corps).toMatchObject({ risque: "moyen", alertes: [{ type: "fortes_pluies" }] });
  });

  it("l'accueil affiche l'indice de risque, chaque alerte et son conseil", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { createElement } = await import("react");
    const { Tableau } = await import("@/components/Tableau");
    const { getClimatRegion, getCultures } = await import("@/lib/data");
    const { calculerRotations } = await import("@/lib/moteur/rotations");
    const { DEFAULT_PARCELLE } = await import("@/lib/parcelle/validate");
    const [climat, cultures] = await Promise.all([getClimatRegion("poro"), getCultures()]);
    const reco = calculerRotations(DEFAULT_PARCELLE, climat, cultures)![1];
    const semis = {
      etat: "en_saison" as const, message: "Saison des pluies en cours.", dateDonnees: "2026-07-15", risque: "eleve" as const,
      alertes: [{ type: "secheresse" as const, niveau: "eleve" as const, depuis: "2026-07-01", message: "Sécheresse : 15 jours sans pluie utile depuis le 1er juillet.", conseil: "Paillez le sol." }],
    };
    render(createElement(Tableau, { climat, reco, semis }));
    expect(screen.getByText("Vigilance élevée")).toBeInTheDocument();
    expect(screen.getByText(/15 jours sans pluie utile/)).toBeInTheDocument();
    expect(screen.getByText(/Paillez le sol/)).toBeInTheDocument();
  });
});

describe("alerte chaleur", () => {
  const avecChaleur = (fin: string, tmax: number[]) =>
    jours(fin, Array(tmax.length).fill(3)).map((j, i, t) => ({ ...j, tmax: i >= t.length - tmax.length ? tmax[i - (t.length - tmax.length)] : 32 }));
  it("3 jours à 38 °C ou plus en saison → moyen ; à 40 °C → élevé ; avec un conseil", () => {
    const m = alertesMeteo(avecChaleur("2026-07-15", [38.5, 39, 38.2]), SAISON);
    expect(m.alertes.find((a) => a.type === "chaleur")).toMatchObject({ niveau: "moyen" });
    expect(m.alertes.find((a) => a.type === "chaleur")!.conseil).toMatch(/paill|matin/);
    expect(alertesMeteo(avecChaleur("2026-07-15", [40.5, 41, 40.2]), SAISON).alertes.find((a) => a.type === "chaleur")!.niveau).toBe("eleve");
  });
  it("hors saison (pas de culture en place), la chaleur de mars n'est pas une alerte", () => {
    expect(alertesMeteo(avecChaleur("2026-03-15", [41, 41, 41]), SAISON).alertes).toEqual([]);
  });
});
