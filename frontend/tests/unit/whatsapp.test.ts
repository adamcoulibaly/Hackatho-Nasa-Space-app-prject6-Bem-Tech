import fs from "node:fs";
import path from "node:path";
import { RotationsSchema } from "@/lib/contract";
import { whatsappUrl, prochaineCulture } from "@/lib/whatsapp";

const [, B] = RotationsSchema.parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo/rotations.json"), "utf8")));

describe("whatsappUrl", () => {
  it("construit un lien wa.me avec le conseil, la lacune et le lien de la fiche", () => {
    const url = whatsappUrl(B, "https://x.test");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    const texte = decodeURIComponent(url.slice("https://wa.me/?text=".length));
    expect(texte).toContain("Maïs → Arachide → Coton");
    expect(texte).toContain(B.lacune);
    expect(texte).toContain("Confiance : moyenne");
    expect(texte).toContain("https://x.test/fiche/B");
  });
});

describe("prochaineCulture", () => {
  it("renvoie la culture de l'année 2 et son mois de semis", () => {
    expect(prochaineCulture(B)).toEqual({ culture: "Arachide", moisSemis: "mai" });
  });
});
