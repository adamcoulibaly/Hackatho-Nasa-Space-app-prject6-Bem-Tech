import { render, screen } from "@testing-library/react";
import { RecoupementPluie, verdictRecoupement } from "@/components/RecoupementPluie";
import { ChaleurChamps, moisLesPlusChauds, phraseChaleur } from "@/components/ChaleurChamps";
import { construireMessages } from "@/lib/ia/assistant";
import type { Climat } from "@/lib/contract";
import { lireClimat, rotations } from "../helpers/moteur";

const climat = lireClimat();

const IMERG: NonNullable<Climat["imerg"]> = {
  pluieMensuelle: [2, 10, 40, 80, 110, 130, 150, 190, 180, 100, 20, 3],
  pluieMensuellePower: [2, 14, 49, 72, 100, 119, 159, 205, 171, 103, 19, 2],
  annuel: 1015, annuelPower: 1015, ecartPct: 0, correlation: 0.89, accord: "bon", mois: 249, periode: "2005–2025", source: "GPM IMERG V07",
};
const ECO: NonNullable<Climat["ecostress"]> = {
  lst: [38.2, 42.5, 44.1, 41.0, 36.0, 33.0, null, null, 31.5, 34.0, 36.5, 37.0],
  et: [0.8, 0.6, 1.1, 2.0, 3.1, 3.5, null, null, 3.8, 3.0, 1.9, 1.0],
  passages: 120, joursChauds: 0.31, seuil: 40, periode: "2023–2024", source: "ECOSTRESS V002", point: "8 points de campagne à 12 km du chef-lieu",
};

describe("GPM IMERG face à NASA POWER", () => {
  it("dit le sens de l'écart et ce qu'en fait l'agriculteur", () => {
    expect(verdictRecoupement(IMERG)).toMatch(/concordent.*identiques.*fiables/);
    expect(verdictRecoupement({ ...IMERG, ecartPct: -21, accord: "moyen" })).toMatch(/21 % de pluie en moins que NASA POWER.*fourchette/);
    expect(verdictRecoupement({ ...IMERG, ecartPct: 36, accord: "faible" })).toMatch(/divergent.*36 % de pluie en plus.*pluviomètre/);
  });
  it("affiche les deux séries avec légende, et un tableau pour les lecteurs d'écran", () => {
    render(<RecoupementPluie imerg={IMERG} />);
    expect(screen.getByText(/NASA POWER ·/)).toBeInTheDocument();
    expect(screen.getByText(/GPM IMERG \(satellites\)/)).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("août");
    expect(screen.getByText(/249 mois \(2005–2025\).*corrélation mois par mois 0,89/)).toBeInTheDocument();
  });
});

describe("ECOSTRESS : chaleur au ras des champs", () => {
  it("nomme les mois les plus chauds et la part des passages au-dessus du seuil", () => {
    expect(moisLesPlusChauds(ECO)).toEqual(["février", "mars", "avril"]);
    expect(phraseChaleur(ECO)).toMatch(/120 passages sans nuage \(2023–2024\).*dépassé 40 °C 31 % du temps, surtout en février, mars et avril/);
    expect(phraseChaleur({ ...ECO, joursChauds: 0 })).toMatch(/jamais dépassé 40 °C/);
  });
  it("trop peu de passages sans nuage : pas de moyenne ni de graphique, et l'IA ne s'en sert pas", () => {
    const rare = { ...ECO, passages: 3, joursChauds: 0.67 };
    expect(phraseChaleur(rare)).toMatch(/que 3 fois ici.*trop peu pour une moyenne fiable/);
    render(<ChaleurChamps ecostress={rare} />);
    expect(screen.queryByTitle(/mars/)).not.toBeInTheDocument();
    const texte = construireMessages(rotations()[1], { ...climat, ecostress: rare }).map((m) => m.content).join("\n");
    expect(texte).not.toMatch(/ECOSTRESS/);
  });
  it("un mois sans passage clair reste vide, pas à zéro", () => {
    render(<ChaleurChamps ecostress={ECO} />);
    expect(screen.getAllByTitle(/juillet : aucun passage sans nuage/)).toHaveLength(2);
    expect(screen.getByTitle("mars : 44,1 °C")).toBeInTheDocument();
  });
});

describe("assistant IA : les mesures satellite font partie du contexte", () => {
  it("IMERG et ECOSTRESS sont cités, et rien n'est dit « pas encore disponible »", () => {
    const r = rotations()[1];
    const texte = construireMessages(r, { ...climat, imerg: { ...IMERG, annuel: 1202, ecartPct: 18, accord: "moyen" }, ecostress: ECO }).map((m) => m.content).join("\n");
    expect(texte).toMatch(/GPM \(IMERG\) : 1202 mm par an, contre 1015 mm pour NASA POWER \(écart 18 %, accord moyen\)/);
    expect(texte).toMatch(/au-dessus de 40 °C lors de 31 % des 120 passages sans nuage/);
    expect(texte).not.toMatch(/pas encore disponibles/);
  });
});
