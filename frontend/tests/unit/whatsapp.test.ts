import { whatsappUrl, prochaineCulture } from "@/lib/whatsapp";
import { rotations } from "../helpers/moteur";

const [, B] = rotations();

describe("whatsappUrl", () => {
  it("construit un lien wa.me avec le conseil, les lacunes et le lien complet de la fiche", () => {
    const url = whatsappUrl(B, "https://x.test/fiche/B?r=poro");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    const texte = decodeURIComponent(url.slice("https://wa.me/?text=".length));
    expect(texte).toContain(B.sequence.join(" → "));
    expect(texte).toContain(B.lacune);
    expect(texte).toContain("Confiance : moyenne");
    expect(texte).toContain("https://x.test/fiche/B?r=poro");
  });
});

describe("prochaineCulture", () => {
  it("renvoie la culture de l'année 2 et son mois de semis (début de la saison des pluies)", () => {
    expect(prochaineCulture(B)).toEqual({ culture: B.sequence[1], moisSemis: "mai" });
  });
});
