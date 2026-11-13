import { render, screen, within } from "@testing-library/react";
import type { Saisons, VerdictSaison } from "@/lib/contract";
import { getClimatRegion, getCultures } from "@/lib/data";
import { calculerRotations, rotationConseillee } from "@/lib/moteur/rotations";
import { DEFAULT_PARCELLE } from "@/lib/parcelle/validate";
import { prochaineCulture } from "@/lib/whatsapp";
import { MaParcelleAujourdhui } from "@/components/MaParcelleAujourdhui";

const v = (annee: number): VerdictSaison => ({ annee, verdict: "bonne", semis: `${annee}-05-28`, ratio: 0.9, cause: "" });
const saisons = (c: string): Saisons => ({
  meta: { region: "poro", source: "", periode: "", saison: { debut: 5, fin: 10 }, reserveMm: 100 },
  cultures: { [c]: [v(2018), v(2019), v(2020)] },
});

async function preparer() {
  const [climat, cultures] = await Promise.all([getClimatRegion("poro"), getCultures()]);
  const reco = rotationConseillee(calculerRotations(DEFAULT_PARCELLE, climat, cultures)!);
  return { climat, cultures, reco };
}

describe("Ma parcelle aujourd'hui", () => {
  it("rassemble en un écran : étape du calendrier, vigilance, végétation NASA, dernière observation, rotation", async () => {
    const { climat, cultures, reco } = await preparer();
    const culture = prochaineCulture(reco).culture;
    render(
      <MaParcelleAujourdhui
        region="Poro (Korhogo)" reco={reco} cultures={cultures} saisons={saisons(culture)} saisonRegion={climat.saisonPluies}
        semis={{ etat: "en_saison", message: "Saison des pluies en cours.", dateDonnees: "2026-07-01", risque: "moyen", alertes: [] }}
        anomalie={{ mois: "2026-06", ndvi: 0.5, habituel: 0.62, ecart: -0.12, anomalie: true, message: "Végétation plus faible que d'habitude." }}
        derniere={{ date: "2026-06-25", culture, etat: "moyenne", pluie: "pas_assez", note: "Feuilles enroulées" }}
        aujourdhui="2026-07-01"
      />,
    );
    expect(within(screen.getByTestId("jour-calendrier")).getByText(new RegExp(culture))).toBeInTheDocument();
    expect(within(screen.getByTestId("jour-vigilance")).getByText("Vigilance moyenne")).toBeInTheDocument();
    expect(within(screen.getByTestId("jour-vegetation")).getByText(/plus faible que d'habitude/)).toBeInTheDocument();
    expect(within(screen.getByTestId("jour-observation")).getByText(/Feuilles enroulées/)).toBeInTheDocument();
    expect(within(screen.getByTestId("jour-rotation")).getByText(new RegExp(`Rotation ${reco.id}`))).toBeInTheDocument();
  });

  it("sans contour, sans observation ni données du jour : il le dit et propose quoi faire, sans rien inventer", async () => {
    const { climat, cultures, reco } = await preparer();
    render(<MaParcelleAujourdhui region="Poro (Korhogo)" reco={reco} cultures={cultures} saisons={null} saisonRegion={climat.saisonPluies} anomalie={null} derniere={null} aujourdhui="2026-07-01" />);
    expect(within(screen.getByTestId("jour-vegetation")).getByRole("link", { name: /Dessiner ma parcelle/ })).toBeInTheDocument();
    expect(within(screen.getByTestId("jour-observation")).getByRole("link", { name: /Noter une observation/ })).toBeInTheDocument();
    expect(within(screen.getByTestId("jour-vigilance")).getByText(/pas encore disponibles/)).toBeInTheDocument();
  });
});

describe("dans l'app", () => {
  it("Ma parcelle aujourd'hui s'ouvre dans l'onglet Tableau", async () => {
    const { ongletDe } = await import("@/lib/modeApp");
    expect(ongletDe("/aujourdhui")).toBe("tableau");
  });
});
