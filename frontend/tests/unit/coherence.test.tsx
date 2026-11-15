import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { SourcesSchema, LexiqueSchema } from "@/lib/contract";
import { getClimatRegion, getCultures, getProjections, getSaisons } from "@/lib/data";
import { calculerRotations } from "@/lib/moteur/rotations";
import { risqueRegion } from "@/lib/moteur/risques";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";

const lire = (f: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo", f), "utf8"));

describe("Méthode : n'annonce que ce que ForoSat utilise vraiment", () => {
  const src = SourcesSchema.parse(lire("sources.json"));
  it("les sources marquées « Utilisé » sont celles du pipeline et du site", () => {
    const utilisees = src.sources.filter((s) => s.priorite === "Utilisé").map((s) => s.nom);
    expect(utilisees).toEqual(expect.arrayContaining(["NASA POWER", "MODIS Terra (NDVI)", "SMAP L4", "GRACE / GRACE-FO", "NASA NEX-GDDP-CMIP6", "GPM IMERG", "SRTM", "ECOSTRESS"]));
    expect(utilisees).not.toContain("Landsat / HLS");
  });
  it("aucune approche n'est dite « testée » si elle ne l'a pas été, et la détection n'est pas attribuée à l'IA", () => {
    expect(src.approches.find((a) => a.id === "rf")!.verdict).toBe("Prévu");
    expect(src.etapes.map((e) => e.titre + e.texte).join(" ")).not.toMatch(/par IA/);
  });
});

describe("Lexique : les nouveaux termes du site sont expliqués", () => {
  it("rendement relatif, projection climatique, rejeu, fenêtre de semis, poche sèche, vigilance", () => {
    const termes = LexiqueSchema.parse(lire("lexique.json")).map((t) => t.terme);
    for (const t of ["Rendement relatif", "Projection climatique", "Rejeu des saisons", "Fenêtre de semis", "Poche sèche", "Vigilance"]) expect(termes).toContain(t);
  });
});

describe("Accueil (tableau de bord) synchronisé avec les autres pages", () => {
  it("le niveau des alertes du jour s'appelle « vigilance », le risque climatique est celui de la carte des risques", async () => {
    const { Tableau } = await import("@/components/Tableau");
    const [climat, cultures, saisons, projections] = await Promise.all([getClimatRegion("poro"), getCultures(), getSaisons("poro"), getProjections("poro")]);
    const reco = calculerRotations(DEFAULT_PARCELLE, climat, cultures, saisons, projections)![1];
    const risque = risqueRegion(saisons, projections);
    const semis = { etat: "en_saison" as const, message: "x", dateDonnees: "2026-08-15", risque: "moyen" as const, alertes: [] };
    render(createElement(Tableau, { climat, reco, semis, risqueClimat: risque }));
    expect(screen.getByText("Vigilance moyenne")).toBeInTheDocument();
    expect(screen.queryByText("Risque moyen", { selector: "span" })?.closest("[aria-label='Alertes agricoles']") ?? null).toBeNull();
    expect(screen.getByText(new RegExp(`${Math.round(risque.actuel * 100)} % de saisons perdues`))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /carte des risques/i })).toHaveAttribute("href", "/risques");
  });
});

describe("Calendrier synchronisé avec l'état de semis de l'accueil", () => {
  it("si les pluies sont installées cette année, la date de semis par défaut est celle de l'accueil", async () => {
    const { CalendrierAgricole } = await import("@/components/CalendrierAgricole");
    const [cultures, saisons] = await Promise.all([getCultures(), getSaisons("poro")]);
    render(createElement(CalendrierAgricole, { cultures, mesCultures: ["Maïs"], saisons, saisonsRegion: [{ debut: 5, fin: 10 }], aujourdhui: "2026-06-20", semisDuJour: "2026-06-02" }));
    expect((screen.getByLabelText("Date de semis") as HTMLInputElement).value).toBe("2026-06-02");
    expect(screen.getByText(/pluies se sont installées le 2 juin/)).toBeInTheDocument();
  });
});

describe("Page d'accueil fidèle au site", () => {
  it("ne dit pas que l'IA détecte, et présente les outils de la saison avec leurs liens", async () => {
    const Accueil = (await import("@/app/page")).default;
    render(createElement(Accueil));
    expect(screen.queryByText(/L'IA y repère/)).toBeNull();
    for (const [nom, href] of [["Simulateur", "/simulateur"], ["Calendrier agricole", "/calendrier"], ["Alertes", "/tableau"], ["Carte des risques", "/risques"], ["Carnet de suivi", "/suivi"]]) {
      expect(screen.getAllByRole("link", { name: new RegExp(nom) }).some((l) => l.getAttribute("href") === href)).toBe(true);
    }
    expect(screen.getByText(/hors connexion/i)).toBeInTheDocument();
  });

  it("la page Méthode n'attribue pas la détection à l'IA", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../src/app/methode/page.tsx"), "utf8");
    expect(src).not.toMatch(/L'IA détecte/);
  });
});
